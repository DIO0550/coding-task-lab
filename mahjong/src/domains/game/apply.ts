import { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import { Wall } from "../wall/index.ts";
import type {
  Action,
  CalledMeld,
  Declaration,
  Discard,
  GameState,
  PlayerState,
  Seat,
} from "./types.ts";
import { SEATS, nextSeat, seatsAfter } from "./types.ts";
import { concealedOf, removeAllExact, removeFirstExact } from "./tiles.ts";
import { evaluateWin } from "./win-input.ts";
import { legalActionsOf, responseOptions } from "./legal.ts";
import { exhaustiveDrawResult, ronDeltas, tsumoDeltas } from "./result.ts";

const RIICHI_STICK_POINTS = 1000;

/** 行動の構造比較用キー(牌は表記=赤5区別ありで正規化) */
const actionKey = (action: Action): string => {
  switch (action.type) {
    case "discard":
    case "riichi":
      return `${action.type}:${Tile.toNotation(action.tile)}`;
    case "chi":
    case "pon":
      return `${action.type}:${action.tiles
        .map((tile) => Tile.toNotation(tile))
        .toSorted()
        .join(",")}`;
    case "kan":
      return `kan:${action.kind}:${Tile.toNotation(action.tile)}`;
    default:
      return action.type;
  }
};

/** 1席分だけ更新したプレイヤー配列を返す */
const updatePlayer = (
  players: readonly PlayerState[],
  seat: Seat,
  patch: Partial<PlayerState>,
): readonly PlayerState[] =>
  players.map((player) =>
    player.seat === seat ? { ...player, ...patch } : player,
  );

/** 全席の一発権とダブルリーチ資格を消す(鳴き・カン成立時) */
const breakIppatsuAll = (
  players: readonly PlayerState[],
): readonly PlayerState[] =>
  players.map((player) => ({
    ...player,
    ippatsu: false,
    doubleRiichiEligible: false,
  }));

/** 応答フェーズの管理フィールドを掃除する */
const clearResponseFields = (state: GameState): GameState => ({
  ...state,
  pendingResponders: undefined,
  declarations: undefined,
  responseKind: undefined,
  pendingKakan: undefined,
});

/** 次の席がツモる。山が尽きていれば荒牌流局へ */
const advanceTurn = (state: GameState, from: Seat): GameState => {
  const next = nextSeat(from);
  const drawn = Wall.drawTile(state.wall);
  if (drawn === null) {
    return {
      ...clearResponseFields(state),
      phase: "result_draw",
      result: exhaustiveDrawResult(state),
      lastDrawKind: null,
    };
  }
  return {
    ...clearResponseFields(state),
    wall: drawn.wall,
    players: updatePlayer(state.players, next, { drawn: drawn.tile }),
    turn: next,
    phase: "action",
    lastDrawKind: "wall",
  };
};

/** 打牌後の応答フェーズを開く。宣言可能な席が無ければ手番を進める */
const openResponse = (state: GameState, discarder: Seat): GameState => {
  const candidate: GameState = {
    ...state,
    phase: "response",
    responseKind: "discard",
    declarations: [],
  };
  const responders = seatsAfter(discarder).filter(
    (seat) => responseOptions(candidate, seat).length > 0,
  );
  if (responders.length === 0) {
    return advanceTurn(state, discarder);
  }
  return { ...candidate, pendingResponders: responders };
};

/** 打牌(リーチ宣言打牌を含む) */
const applyDiscard = (
  state: GameState,
  seat: Seat,
  tile: Tile,
  declareRiichi: boolean,
): GameState => {
  const player = state.players[seat];
  const fromDrawn =
    player.drawn !== null && Tile.equalsExact(player.drawn, tile);
  const baseHand = fromDrawn
    ? player.hand
    : (() => {
        const removed = removeFirstExact(player.hand, tile);
        if (removed === null) {
          return null;
        }
        return player.drawn === null ? removed : [...removed, player.drawn];
      })();
  if (baseHand === null) {
    return state;
  }
  const discard: Discard = {
    tile,
    tsumogiri: fromDrawn,
    riichiDeclare: declareRiichi,
    calledBy: null,
  };
  const riichiPatch: Partial<PlayerState> = declareRiichi
    ? {
        riichi: player.doubleRiichiEligible ? "double" : "riichi",
        ippatsu: true,
        points: player.points - RIICHI_STICK_POINTS,
      }
    : { ippatsu: false };
  const players = updatePlayer(state.players, seat, {
    hand: baseHand.toSorted(Tile.compare),
    drawn: null,
    discards: [...player.discards, discard],
    doubleRiichiEligible: false,
    ...riichiPatch,
  });
  const discarded: GameState = {
    ...state,
    players,
    riichiSticks: declareRiichi
      ? state.riichiSticks + 1
      : state.riichiSticks,
    lastDiscard: { seat, tile },
    lastDrawKind: null,
  };
  return openResponse(discarded, seat);
};

/** ツモ和了 */
const applyTsumo = (state: GameState, seat: Seat): GameState => {
  const player = state.players[seat];
  if (player.drawn === null) {
    return state;
  }
  const score = evaluateWin(state, seat, player.drawn, {
    winType: "tsumo",
    chankan: false,
  });
  if (score === null) {
    return state;
  }
  return {
    ...clearResponseFields(state),
    phase: "result_win",
    result: {
      kind: "win",
      winner: seat,
      loser: null,
      winType: "tsumo",
      score,
      pointDeltas: tsumoDeltas(state, seat, score),
      dealerContinues: seat === state.dealer,
    },
  };
};

/** 暗槓: 面子公開・全席一発消し・嶺上ツモ・新ドラ公開 */
const applyAnkan = (state: GameState, seat: Seat, kind: Tile): GameState => {
  const player = state.players[seat];
  const concealed = concealedOf(player);
  const kanTiles = concealed
    .filter((tile) => Tile.equals(tile, kind))
    .toSorted(Tile.compare);
  if (kanTiles.length !== 4) {
    return state;
  }
  const rest = concealed.filter((tile) => !Tile.equals(tile, kind));
  const rinshan = Wall.drawRinshan(state.wall);
  if (rinshan === null) {
    return state;
  }
  const meld: Meld = { type: "ankan", tiles: kanTiles };
  const called: CalledMeld = { meld, calledFrom: null, calledTile: null };
  const players = updatePlayer(breakIppatsuAll(state.players), seat, {
    hand: rest.toSorted(Tile.compare),
    drawn: rinshan.tile,
    melds: [...player.melds, called],
  });
  return {
    ...state,
    players,
    wall: rinshan.wall,
    lastDrawKind: "rinshan",
  };
};

/** 加槓を成立させる(槍槓されなかった場合)。ポンをカンへ差し替え嶺上ツモ */
const completeKakan = (state: GameState): GameState => {
  const pending = state.pendingKakan;
  if (pending === undefined) {
    return state;
  }
  const player = state.players[pending.seat];
  const rinshan = Wall.drawRinshan(state.wall);
  if (rinshan === null) {
    return state;
  }
  const melds = player.melds.map((called): CalledMeld => {
    if (
      called.meld.type !== "pon" ||
      !Tile.equals(called.meld.tiles[0], pending.tile)
    ) {
      return called;
    }
    return {
      ...called,
      meld: {
        type: "kan",
        tiles: [...called.meld.tiles, pending.tile].toSorted(Tile.compare),
      },
    };
  });
  const players = updatePlayer(breakIppatsuAll(state.players), pending.seat, {
    melds,
    drawn: rinshan.tile,
  });
  return {
    ...clearResponseFields(state),
    players,
    wall: rinshan.wall,
    turn: pending.seat,
    phase: "action",
    lastDiscard: null,
    lastDrawKind: "rinshan",
  };
};

/** 加槓宣言: 牌を手から外し、槍槓可能な席があれば応答フェーズを開く */
const applyKakan = (state: GameState, seat: Seat, tile: Tile): GameState => {
  const player = state.players[seat];
  const concealed = concealedOf(player);
  const added = concealed.find((own) => Tile.equals(own, tile));
  if (added === undefined) {
    return state;
  }
  const rest = removeFirstExact(concealed, added);
  if (rest === null) {
    return state;
  }
  const candidate: GameState = {
    ...state,
    players: updatePlayer(state.players, seat, {
      hand: rest.toSorted(Tile.compare),
      drawn: null,
    }),
    phase: "response",
    responseKind: "kakan",
    pendingKakan: { seat, tile: added },
    lastDiscard: { seat, tile: added },
    declarations: [],
  };
  const responders = seatsAfter(seat).filter(
    (other) => responseOptions(candidate, other).length > 0,
  );
  if (responders.length === 0) {
    return completeKakan(candidate);
  }
  return { ...candidate, pendingResponders: responders };
};

/** ロン和了を確定する(頭跳ね解決後)。リーチ宣言牌へのロンはリーチを取り消す */
const resolveRon = (state: GameState, winner: Seat): GameState => {
  if (state.lastDiscard === null) {
    return state;
  }
  const { seat: loser, tile } = state.lastDiscard;
  const chankan = state.responseKind === "kakan";
  const loserState = state.players[loser];
  const lastDiscardEntry = loserState.discards.at(-1);
  const cancelRiichi =
    !chankan &&
    lastDiscardEntry !== undefined &&
    lastDiscardEntry.riichiDeclare;
  const rolledBack: GameState = cancelRiichi
    ? {
        ...state,
        riichiSticks: state.riichiSticks - 1,
        players: updatePlayer(state.players, loser, {
          riichi: "none",
          ippatsu: false,
          discards: [
            ...loserState.discards.slice(0, -1),
            { ...lastDiscardEntry, riichiDeclare: false },
          ],
        }),
      }
    : state;
  const score = evaluateWin(rolledBack, winner, tile, {
    winType: "ron",
    chankan,
  });
  if (score === null) {
    return state;
  }
  return {
    ...clearResponseFields(rolledBack),
    phase: "result_win",
    result: {
      kind: "win",
      winner,
      loser,
      winType: "ron",
      score,
      pointDeltas: ronDeltas(rolledBack, winner, loser, score, cancelRiichi),
      dealerContinues: winner === state.dealer,
    },
  };
};

/** チー・ポン・明カンを成立させる */
const resolveCall = (state: GameState, declaration: Declaration): GameState => {
  if (state.lastDiscard === null) {
    return state;
  }
  const { seat: discarder, tile } = state.lastDiscard;
  const caller = declaration.seat;
  const player = state.players[caller];
  const action = declaration.action;

  const buildMeld = (): {
    meld: Meld;
    hand: readonly Tile[];
    rinshan: boolean;
  } | null => {
    if (action.type === "chi" || action.type === "pon") {
      const hand = removeAllExact(player.hand, action.tiles);
      if (hand === null) {
        return null;
      }
      const tiles = [...action.tiles, tile].toSorted(Tile.compare);
      return {
        meld: { type: action.type === "chi" ? "chi" : "pon", tiles },
        hand,
        rinshan: false,
      };
    }
    if (action.type === "kan" && action.kind === "minkan") {
      const own = player.hand.filter((item) => Tile.equals(item, tile));
      if (own.length < 3) {
        return null;
      }
      const used = own.slice(0, 3);
      const hand = removeAllExact(player.hand, used);
      if (hand === null) {
        return null;
      }
      return {
        meld: {
          type: "kan",
          tiles: [...used, tile].toSorted(Tile.compare),
        },
        hand,
        rinshan: true,
      };
    }
    return null;
  };

  const built = buildMeld();
  if (built === null) {
    return state;
  }
  const rinshan = built.rinshan ? Wall.drawRinshan(state.wall) : null;
  if (built.rinshan && rinshan === null) {
    return state;
  }
  const called: CalledMeld = {
    meld: built.meld,
    calledFrom: discarder,
    calledTile: tile,
  };
  const discarderState = state.players[discarder];
  const markedDiscards = [
    ...discarderState.discards.slice(0, -1),
    { ...discarderState.discards.at(-1)!, calledBy: caller },
  ];
  const players = updatePlayer(
    updatePlayer(breakIppatsuAll(state.players), discarder, {
      discards: markedDiscards,
    }),
    caller,
    {
      hand: built.hand.toSorted(Tile.compare),
      melds: [...player.melds, called],
      drawn: rinshan === null ? null : rinshan.tile,
    },
  );
  return {
    ...clearResponseFields(state),
    players,
    wall: rinshan === null ? state.wall : rinshan.wall,
    turn: caller,
    phase: "action",
    lastDiscard: null,
    lastDrawKind: rinshan === null ? null : "rinshan",
  };
};

/** 収集済みの宣言を優先順位(ロン>ポン/カン>チー)で解決する */
const resolveResponses = (state: GameState): GameState => {
  const declarations = state.declarations ?? [];
  if (state.lastDiscard !== null) {
    const rons = declarations.filter((decl) => decl.action.type === "ron");
    if (rons.length > 0) {
      // 頭跳ね: 打牌者から見て回り順が早い席が勝つ
      const order = seatsAfter(state.lastDiscard.seat);
      const winner = order.find((seat) =>
        rons.some((decl) => decl.seat === seat),
      );
      if (winner !== undefined) {
        return resolveRon(state, winner);
      }
    }
  }
  const call =
    declarations.find(
      (decl) => decl.action.type === "pon" || decl.action.type === "kan",
    ) ?? declarations.find((decl) => decl.action.type === "chi");
  if (call !== undefined) {
    return resolveCall(state, call);
  }
  if (state.responseKind === "kakan") {
    return completeKakan(state);
  }
  return state.lastDiscard === null
    ? state
    : advanceTurn(state, state.lastDiscard.seat);
};

/** 応答(宣言またはパス)を1席分記録し、全席そろったら解決する */
const applyResponse = (
  state: GameState,
  seat: Seat,
  action: Action,
): GameState => {
  const pending = state.pendingResponders ?? [];
  const remaining = pending.filter((other) => other !== seat);
  // リーチ後の見逃し: ロンできたのにパスしたら以降ロン不可
  const player = state.players[seat];
  const missedRon =
    action.type === "pass" &&
    player.riichi !== "none" &&
    responseOptions(state, seat).some((option) => option.type === "ron");
  const players = missedRon
    ? updatePlayer(state.players, seat, { riichiFuriten: true })
    : state.players;
  const declarations =
    action.type === "pass"
      ? (state.declarations ?? [])
      : [...(state.declarations ?? []), { seat, action }];
  const collected: GameState = {
    ...state,
    players,
    pendingResponders: remaining,
    declarations,
  };
  if (remaining.length > 0) {
    return collected;
  }
  return resolveResponses(collected);
};

/**
 * 行動を適用して新しい状態を返す。
 * 不正な行動(legalActions に無い・手番でない等)は状態をそのまま返す
 */
export const applyAction = (
  state: GameState,
  seat: Seat,
  action: Action,
): GameState => {
  if (!SEATS.includes(seat)) {
    return state;
  }
  const legal = legalActionsOf(state, seat);
  const key = actionKey(action);
  if (!legal.some((candidate) => actionKey(candidate) === key)) {
    return state;
  }
  if (state.phase === "action") {
    switch (action.type) {
      case "discard":
        return applyDiscard(state, seat, action.tile, false);
      case "riichi":
        return applyDiscard(state, seat, action.tile, true);
      case "tsumo":
        return applyTsumo(state, seat);
      case "kan":
        return action.kind === "ankan"
          ? applyAnkan(state, seat, action.tile)
          : action.kind === "kakan"
            ? applyKakan(state, seat, action.tile)
            : state;
      default:
        return state;
    }
  }
  if (state.phase === "response") {
    return applyResponse(state, seat, action);
  }
  return state;
};
