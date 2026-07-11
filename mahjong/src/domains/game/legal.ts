import { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import { Hand } from "../hand/index.ts";
import { Wall } from "../wall/index.ts";
import type { Action, GameState, PlayerState, Seat } from "./types.ts";
import { nextSeat } from "./types.ts";
import {
  concealedOf,
  countKind,
  distinctByNotation,
  isDiscardFuriten,
  meldsOf,
  removeFirstExact,
  waitsOf,
} from "./tiles.ts";
import { evaluateWin } from "./win-input.ts";

const RIICHI_MIN_POINTS = 1000;
const RIICHI_MIN_REMAINING = 4;
const MAX_RINSHAN = 4;

/** 面前(副露が暗槓のみ)か */
const isMenzen = (player: PlayerState): boolean =>
  player.melds.every((called) => called.meld.type === "ankan");

/** カン(嶺上ツモ)が物理的に可能か */
const canDrawRinshan = (state: GameState): boolean =>
  state.wall.rinshanDrawn < MAX_RINSHAN && Wall.remaining(state.wall) >= 1;

/** 待ち牌の集合(赤無視の表記)が一致するか */
const sameWaits = (a: readonly Tile[], b: readonly Tile[]): boolean => {
  const keys = (tiles: readonly Tile[]) =>
    tiles
      .map((tile) => Tile.key(tile))
      .toSorted()
      .join(",");
  return keys(a) === keys(b);
};

/** 暗槓候補(リーチ中はツモ牌の暗槓かつ待ちが変わらないもののみ=送りカン不可) */
const ankanCandidates = (
  state: GameState,
  player: PlayerState,
): readonly Action[] => {
  if (!canDrawRinshan(state)) {
    return [];
  }
  const concealed = concealedOf(player);
  const kinds = distinctByNotation(
    concealed.filter((tile) => countKind(concealed, tile) === 4),
  );
  // 同種4枚は赤を含んでも1候補(赤5と5は同じカン)
  const uniqueKinds = kinds.filter(
    (tile, index) =>
      kinds.findIndex((other) => Tile.equals(other, tile)) === index,
  );
  return uniqueKinds
    .filter((kind) => {
      if (player.riichi === "none") {
        return true;
      }
      if (player.drawn === null || !Tile.equals(player.drawn, kind)) {
        return false;
      }
      const before = waitsOf(player);
      const afterHand = player.hand.filter((tile) => !Tile.equals(tile, kind));
      const kanMeld: Meld = {
        type: "ankan",
        tiles: concealed
          .filter((tile) => Tile.equals(tile, kind))
          .toSorted(Tile.compare),
      };
      const after = Hand.waits(afterHand, [...meldsOf(player), kanMeld]);
      return after.length > 0 && sameWaits(before, after);
    })
    .map((kind) => ({ type: "kan", tile: kind, kind: "ankan" }) as const);
};

/** 加槓候補(自分のポンに4枚目を足す)。リーチ中は不可 */
const kakanCandidates = (
  state: GameState,
  player: PlayerState,
): readonly Action[] => {
  if (!canDrawRinshan(state) || player.riichi !== "none") {
    return [];
  }
  const concealed = concealedOf(player);
  return player.melds
    .filter((called) => called.meld.type === "pon")
    .flatMap((called) => {
      const kind = called.meld.tiles[0];
      const candidate = concealed.find((tile) => Tile.equals(tile, kind));
      return candidate === undefined
        ? []
        : [{ type: "kan", tile: candidate, kind: "kakan" } as const];
    });
};

/** リーチ宣言候補(宣言打牌ごと)。面前・テンパイ・1000点・残り山4枚以上 */
const riichiCandidates = (
  state: GameState,
  player: PlayerState,
): readonly Action[] => {
  if (
    player.riichi !== "none" ||
    !isMenzen(player) ||
    player.points < RIICHI_MIN_POINTS ||
    Wall.remaining(state.wall) < RIICHI_MIN_REMAINING
  ) {
    return [];
  }
  const concealed = concealedOf(player);
  const melds = meldsOf(player);
  return distinctByNotation(concealed)
    .filter((tile) => {
      const rest = removeFirstExact(concealed, tile);
      return rest !== null && Hand.waits(rest, melds).length > 0;
    })
    .map((tile) => ({ type: "riichi", tile }) as const);
};

/** 手番(action フェーズ)で取れる行動 */
const turnActions = (state: GameState, seat: Seat): readonly Action[] => {
  const player = state.players[seat];
  const actions: Action[] = [];
  if (player.drawn !== null) {
    const win = evaluateWin(state, seat, player.drawn, {
      winType: "tsumo",
      chankan: false,
    });
    if (win !== null) {
      actions.push({ type: "tsumo" });
    }
    actions.push(...ankanCandidates(state, player));
    actions.push(...kakanCandidates(state, player));
    actions.push(...riichiCandidates(state, player));
    if (player.riichi !== "none") {
      actions.push({ type: "discard", tile: player.drawn });
    } else {
      for (const tile of distinctByNotation(concealedOf(player))) {
        actions.push({ type: "discard", tile });
      }
    }
    return actions;
  }
  // 鳴き直後(ツモなし)は打牌のみ
  for (const tile of distinctByNotation(player.hand)) {
    actions.push({ type: "discard", tile });
  }
  return actions;
};

/** ロン可能か(役あり・フリテンでない) */
const canRon = (
  state: GameState,
  seat: Seat,
  tile: Tile,
  chankan: boolean,
): boolean => {
  const player = state.players[seat];
  if (player.riichiFuriten || isDiscardFuriten(player)) {
    return false;
  }
  return evaluateWin(state, seat, tile, { winType: "ron", chankan }) !== null;
};

/** ポン候補(手中2枚の組み合わせ。赤5の含め方で複数候補になり得る) */
const ponCandidates = (
  player: PlayerState,
  tile: Tile,
): readonly Action[] => {
  const matching = player.hand.filter((own) => Tile.equals(own, tile));
  if (matching.length < 2) {
    return [];
  }
  const seen = new Set<string>();
  const actions: Action[] = [];
  for (let i = 0; i < matching.length; i += 1) {
    for (let j = i + 1; j < matching.length; j += 1) {
      const pair = [matching[i], matching[j]] as const;
      const key = pair
        .map((item) => Tile.toNotation(item))
        .toSorted()
        .join(",");
      if (!seen.has(key)) {
        seen.add(key);
        actions.push({ type: "pon", tiles: pair });
      }
    }
  }
  return actions;
};

/** チー候補(下家のみ)。打牌と合わせて順子になる手中2枚の組み合わせ */
const chiCandidates = (
  player: PlayerState,
  tile: Tile,
): readonly Action[] => {
  if (tile.suit === "z") {
    return [];
  }
  const patterns: readonly (readonly [number, number])[] = [
    [tile.rank - 2, tile.rank - 1],
    [tile.rank - 1, tile.rank + 1],
    [tile.rank + 1, tile.rank + 2],
  ];
  const seen = new Set<string>();
  const actions: Action[] = [];
  for (const [rankA, rankB] of patterns) {
    if (rankA < 1 || rankB > 9) {
      continue;
    }
    const candidatesA = distinctByNotation(
      player.hand.filter((own) => own.suit === tile.suit && own.rank === rankA),
    );
    const candidatesB = distinctByNotation(
      player.hand.filter((own) => own.suit === tile.suit && own.rank === rankB),
    );
    for (const a of candidatesA) {
      for (const b of candidatesB) {
        const key = [a, b]
          .map((item) => Tile.toNotation(item))
          .toSorted()
          .join(",");
        if (!seen.has(key)) {
          seen.add(key);
          actions.push({ type: "chi", tiles: [a, b] });
        }
      }
    }
  }
  return actions;
};

/**
 * 打牌/加槓に対して seat が宣言できる行動(パスを除く)。
 * pendingResponders の算出にも使う
 */
export const responseOptions = (
  state: GameState,
  seat: Seat,
): readonly Action[] => {
  if (state.lastDiscard === null || seat === state.lastDiscard.seat) {
    return [];
  }
  const { tile, seat: discarder } = state.lastDiscard;
  if (state.responseKind === "kakan") {
    return canRon(state, seat, tile, true) ? [{ type: "ron" }] : [];
  }
  const player = state.players[seat];
  const actions: Action[] = [];
  if (canRon(state, seat, tile, false)) {
    actions.push({ type: "ron" });
  }
  const callableWall = Wall.remaining(state.wall) >= 1;
  if (player.riichi === "none" && callableWall) {
    actions.push(...ponCandidates(player, tile));
    if (
      countKind(player.hand, tile) >= 3 &&
      state.wall.rinshanDrawn < MAX_RINSHAN
    ) {
      actions.push({ type: "kan", tile, kind: "minkan" });
    }
    if (seat === nextSeat(discarder)) {
      actions.push(...chiCandidates(player, tile));
    }
  }
  return actions;
};

/** その席が今取れる行動の一覧 */
export const legalActionsOf = (
  state: GameState,
  seat: Seat,
): readonly Action[] => {
  if (state.phase === "action") {
    return seat === state.turn ? turnActions(state, seat) : [];
  }
  if (state.phase === "response") {
    if (!state.pendingResponders?.includes(seat)) {
      return [];
    }
    const options = responseOptions(state, seat);
    return options.length === 0 ? [] : [...options, { type: "pass" }];
  }
  return [];
};
