import { Tile } from "@/src/domains/tile";
import type { Meld } from "@/src/domains/meld";
import { Wall } from "@/src/domains/wall";
import type {
  ClaimOption,
  ClaimsPhase,
  GameAction,
  GameState,
} from "@/src/domains/game";
import {
  MAX_KANS,
  PLAYER_COUNT,
  clearAllIppatsu,
  countKind,
  distinctTiles,
  refreshWaits,
  removeOne,
  takeKind,
  totalKans,
  updatePlayer,
} from "./state";
import { evaluateWin, processWin } from "./win";
import {
  advanceAfterDiscard,
  completeKakan,
  drawRinshanFor,
  markPassedWaits,
} from "./flow";

/** 打牌とチーを構成できる手牌2枚の組み合わせを列挙する(赤5は別の牌として扱う) */
const computeChiOptions = (
  hand: readonly Tile[],
  tile: Tile,
): readonly (readonly [Tile, Tile])[] => {
  const suit = Tile.suitOf(tile);
  const number = Tile.numberOf(tile);
  if (suit === null || number === null) {
    return [];
  }
  const candidatesOf = (n: number): readonly Tile[] =>
    distinctTiles(
      hand.filter(
        (own) => Tile.suitOf(own) === suit && Tile.numberOf(own) === n,
      ),
    );
  const patterns = [
    [number - 2, number - 1],
    [number - 1, number + 1],
    [number + 1, number + 2],
  ].filter(([a, b]) => a >= 1 && b <= 9);
  return patterns.flatMap(([a, b]) =>
    candidatesOf(a).flatMap((tileA) =>
      candidatesOf(b).map((tileB) => [tileA, tileB] as const),
    ),
  );
};

/** 打牌に対する各家の宣言可能アクションを列挙する */
export const computeClaimOptions = (
  state: GameState,
  from: number,
  tile: Tile,
): readonly ClaimOption[] => {
  const options: ClaimOption[] = [];
  const isLastDiscard = state.wallCount === 0;
  const kanAvailable =
    totalKans(state) < MAX_KANS && Wall.canRinshan(state.wall);
  for (let seat = 0; seat < PLAYER_COUNT; seat += 1) {
    if (seat === from) {
      continue;
    }
    const player = state.players[seat];
    const canRon =
      !player.furiten && evaluateWin(state, seat, tile, "ron", "discard") !== null;
    // 河底牌は鳴けない・リーチ者は鳴かない
    const canClaim = !isLastDiscard && player.riichi === "none";
    const canPon = canClaim && countKind(player.hand, tile) >= 2;
    const canKan =
      canClaim && kanAvailable && countKind(player.hand, tile) >= 3;
    const chiOptions =
      canClaim && seat === (from + 1) % PLAYER_COUNT
        ? computeChiOptions(player.hand, tile)
        : [];
    if (canRon || canPon || canKan || chiOptions.length > 0) {
      options.push({ player: seat, canRon, canPon, canKan, chiOptions });
    }
  }
  return options;
};

/** 加槓に対する槍槓(ロン)可能な席を列挙する */
export const computeChankanOptions = (
  state: GameState,
  from: number,
  tile: Tile,
): readonly ClaimOption[] => {
  const options: ClaimOption[] = [];
  for (let seat = 0; seat < PLAYER_COUNT; seat += 1) {
    if (seat === from) {
      continue;
    }
    const player = state.players[seat];
    if (
      !player.furiten &&
      evaluateWin(state, seat, tile, "ron", "kakan") !== null
    ) {
      options.push({
        player: seat,
        canRon: true,
        canPon: false,
        canKan: false,
        chiOptions: [],
      });
    }
  }
  return options;
};

/** 鳴かれた打牌に claimed マークを付ける */
const markClaimed = (state: GameState, from: number): GameState => {
  const player = state.players[from];
  const discards = player.discards.map((entry, index) =>
    index === player.discards.length - 1 ? { ...entry, claimed: true } : entry,
  );
  return updatePlayer(state, from, { ...player, discards });
};

/** チー・ポン・大明カン共通の前処理(見逃し→claimed→一発消し→中断記録) */
const beginCall = (state: GameState, phase: ClaimsPhase): GameState =>
  clearAllIppatsu({
    ...markClaimed(markPassedWaits(state, phase.tile, [phase.from]), phase.from),
    interrupted: true,
  });

const resolvePon = (
  state: GameState,
  phase: ClaimsPhase,
  caller: number,
): GameState => {
  const base = beginCall(state, phase);
  const player = base.players[caller];
  const taken = takeKind(player.hand, phase.tile, 2);
  if (taken === null) {
    return state;
  }
  const meld: Meld = {
    type: "pon",
    tiles: Tile.sort([phase.tile, ...taken.taken]),
  };
  const next = updatePlayer(base, caller, {
    ...player,
    hand: Tile.sort(taken.rest),
    drawn: null,
    melds: [...player.melds, { meld, from: phase.from }],
  });
  return { ...next, rinshan: false, phase: { type: "turn", actor: caller } };
};

const resolveDaiminkan = (
  state: GameState,
  phase: ClaimsPhase,
  caller: number,
): GameState => {
  const base = beginCall(state, phase);
  const player = base.players[caller];
  const taken = takeKind(player.hand, phase.tile, 3);
  if (taken === null) {
    return state;
  }
  const meld: Meld = {
    type: "kan",
    tiles: Tile.sort([phase.tile, ...taken.taken]),
  };
  const next = updatePlayer(
    base,
    caller,
    refreshWaits({
      ...player,
      hand: Tile.sort(taken.rest),
      drawn: null,
      melds: [...player.melds, { meld, from: phase.from }],
    }),
  );
  return drawRinshanFor(next, caller);
};

const resolveChi = (
  state: GameState,
  phase: ClaimsPhase,
  caller: number,
  tiles: readonly [Tile, Tile],
): GameState => {
  const base = beginCall(state, phase);
  const player = base.players[caller];
  const afterFirst = removeOne(player.hand, tiles[0]);
  const afterSecond = afterFirst === null ? null : removeOne(afterFirst, tiles[1]);
  if (afterSecond === null) {
    return state;
  }
  const meld: Meld = {
    type: "chi",
    tiles: Tile.sort([phase.tile, tiles[0], tiles[1]]),
  };
  const next = updatePlayer(base, caller, {
    ...player,
    hand: Tile.sort(afterSecond),
    drawn: null,
    melds: [...player.melds, { meld, from: phase.from }],
  });
  return { ...next, rinshan: false, phase: { type: "turn", actor: caller } };
};

/** 全員の応答が揃った claims フェーズを優先順位(ロン > ポン/カン > チー)で解決する */
const resolveClaims = (state: GameState, phase: ClaimsPhase): GameState => {
  const responseOf = (seat: number): GameAction | null =>
    phase.responses[seat] ?? null;

  // ロン(複数は頭ハネ: 放銃者から反時計回りで最も近い席)
  const ronSeats = phase.options
    .filter((option) => responseOf(option.player)?.type === "ron")
    .map((option) => option.player)
    .sort(
      (a, b) =>
        ((a - phase.from + PLAYER_COUNT) % PLAYER_COUNT) -
        ((b - phase.from + PLAYER_COUNT) % PLAYER_COUNT),
    );
  if (ronSeats.length > 0) {
    const winner = ronSeats[0];
    const scoring = evaluateWin(state, winner, phase.tile, "ron", phase.source);
    if (scoring !== null) {
      return processWin(state, winner, "ron", phase.from, scoring);
    }
  }

  if (phase.source === "kakan") {
    // 槍槓不成立 → カン完成(見逃しはフリテン)
    return completeKakan(
      markPassedWaits(state, phase.tile, [phase.from]),
      phase.from,
      phase.tile,
    );
  }

  const findCaller = (types: readonly GameAction["type"][]): number | null => {
    const option = phase.options.find((candidate) => {
      const response = responseOf(candidate.player);
      return response !== null && types.includes(response.type);
    });
    return option ? option.player : null;
  };

  const kanCaller = findCaller(["kan"]);
  if (kanCaller !== null) {
    return resolveDaiminkan(state, phase, kanCaller);
  }
  const ponCaller = findCaller(["pon"]);
  if (ponCaller !== null) {
    return resolvePon(state, phase, ponCaller);
  }
  const chiCaller = findCaller(["chi"]);
  if (chiCaller !== null) {
    const response = responseOf(chiCaller);
    if (response !== null && response.type === "chi") {
      return resolveChi(state, phase, chiCaller, response.tiles);
    }
  }

  // 全員パス
  return advanceAfterDiscard(state, phase.from, phase.tile);
};

/** 応答がオプションに対して適法か */
const isLegalResponse = (option: ClaimOption, action: GameAction): boolean => {
  switch (action.type) {
    case "ron":
      return option.canRon;
    case "pon":
      return option.canPon;
    case "kan":
      return option.canKan;
    case "chi": {
      const sorted = Tile.sort(action.tiles);
      return option.chiOptions.some(
        (pair) =>
          Tile.sort(pair)[0] === sorted[0] && Tile.sort(pair)[1] === sorted[1],
      );
    }
    case "pass":
      return true;
    default:
      return false;
  }
};

/** claims フェーズへの応答を記録し、全員揃ったら解決する */
export const applyClaimAction = (
  state: GameState,
  action: GameAction,
): GameState => {
  if (state.phase.type !== "claims") {
    return state;
  }
  const phase = state.phase;
  if (action.type === "confirmRoundEnd") {
    return state;
  }
  const option = phase.options.find(
    (candidate) => candidate.player === action.player,
  );
  if (option === undefined || phase.responses[action.player] !== null) {
    return state;
  }
  if (!isLegalResponse(option, action)) {
    return state;
  }
  const responses = phase.responses.map((current, seat) =>
    seat === action.player ? action : current,
  );
  const allAnswered = phase.options.every(
    (candidate) => responses[candidate.player] !== null,
  );
  const nextPhase: ClaimsPhase = { ...phase, responses };
  const next = { ...state, phase: nextPhase };
  return allAnswered ? resolveClaims(next, nextPhase) : next;
};
