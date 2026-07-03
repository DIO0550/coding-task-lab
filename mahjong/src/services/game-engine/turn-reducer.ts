import { Tile } from "../../domains/tile/index.ts";
import type { GameAction, MatchState, PlayerState, SeatIndex } from "../../domains/game/index.ts";
import { ankanCandidates, kakanCandidates } from "./kan-ops.ts";
import { legalActions } from "./legal-actions.ts";
import { eligibleRespondersFor } from "./claim-options.ts";
import { resolveWin } from "./win-resolution.ts";
import { tsumoSituational } from "./situational.ts";
import { removeExact, removeMatching, sortHand } from "./tile-ops.ts";
import { drawForSeat } from "./turn-advance.ts";
import { Wall } from "../../domains/game/index.ts";
import type { Meld } from "../../domains/meld/index.ts";

const assertTurnActor = (state: MatchState, seat: SeatIndex): void => {
  if (state.phase.type !== "turn" || state.phase.actor !== seat) {
    throw new Error("いまその席の手番ではない");
  }
};

const applyTsumo = (state: MatchState, seat: SeatIndex): MatchState => {
  assertTurnActor(state, seat);
  const player = state.players[seat];
  if (player.drawnTile === null) {
    throw new Error("ツモ牌が無いのにツモ和了しようとした");
  }
  const situational = tsumoSituational(state, seat);
  return resolveWin(state, {
    winner: seat,
    winType: "tsumo",
    discarderSeat: null,
    winTile: player.drawnTile,
    situational,
  });
};

const applyDiscard = (
  state: MatchState,
  seat: SeatIndex,
  tile: Tile,
  declareRiichi: boolean,
): MatchState => {
  assertTurnActor(state, seat);
  const player = state.players[seat];

  const options = legalActions(state).filter((a) => a.seat === seat);
  const discardOption = options.find((a) => a.type === "discard");
  if (discardOption === undefined || discardOption.type !== "discard") {
    throw new Error("この席は打牌できない");
  }
  if (!discardOption.tiles.some((t) => Tile.strictEquals(t, tile))) {
    throw new Error(`打牌として不正な牌: ${Tile.format(tile)}`);
  }
  if (declareRiichi) {
    const riichiOption = options.find((a) => a.type === "riichi");
    if (riichiOption === undefined || riichiOption.type !== "riichi" || !riichiOption.tiles.some((t) => Tile.strictEquals(t, tile))) {
      throw new Error("リーチ宣言として不正な牌、またはリーチ条件を満たしていない");
    }
  }

  const pool = player.drawnTile !== null ? [...player.hand, player.drawnTile] : player.hand;
  const remainingHand = sortHand(removeExact(pool, tile));

  const isDoubleRiichi = declareRiichi && !player.hasDrawnThisKyoku && !state.anyCallHappened;

  const updatedSelf: PlayerState = {
    ...player,
    hand: remainingHand,
    drawnTile: null,
    river: [...player.river, { tile, riichiDeclare: declareRiichi }],
    score: declareRiichi ? player.score - 1000 : player.score,
    riichi: declareRiichi ? (isDoubleRiichi ? "double" : "riichi") : player.riichi,
    ippatsuEligible: declareRiichi ? true : player.riichi !== "none" ? false : player.ippatsuEligible,
    hasDrawnThisKyoku: true,
  };

  const nextPlayers = state.players.map((p, s) => (s === seat ? updatedSelf : p)) as [
    PlayerState,
    PlayerState,
    PlayerState,
    PlayerState,
  ];

  const nextState: MatchState = {
    ...state,
    players: nextPlayers,
    kyotaku: declareRiichi ? state.kyotaku + 1 : state.kyotaku,
  };

  const eligible = eligibleRespondersFor(nextState, { kind: "discard", sourceSeat: seat, tile });
  if (eligible.length === 0) {
    return drawForSeat(nextState, (((seat + 1) % 4) as SeatIndex));
  }

  return {
    ...nextState,
    phase: { type: "claims", kind: "discard", sourceSeat: seat, tile, eligible, responses: [] },
  };
};

const applyAnkan = (state: MatchState, seat: SeatIndex, tile: Tile): MatchState => {
  const player = state.players[seat];
  if (player.drawnTile === null) {
    throw new Error("アンカンするツモ牌が無い");
  }
  const pool = [...player.hand, player.drawnTile];
  const { removed, remaining } = removeMatching(pool, tile, 4);
  const meld: Meld = { type: "ankan", tiles: removed };
  const kanCount = state.kanCount + 1;
  const rinshan = Wall.rinshanTile(state, kanCount - 1);

  const nextPlayers = state.players.map((p, s) => {
    if (s !== seat) {
      return { ...p, ippatsuEligible: false };
    }
    return {
      ...p,
      hand: sortHand(remaining),
      drawnTile: rinshan,
      melds: [...p.melds, meld],
      ippatsuEligible: false,
      hasDrawnThisKyoku: true,
    };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players: nextPlayers,
    kanCount,
    phase: { type: "turn", actor: seat, drawSource: "rinshan" },
  };
};

const applyKakanDeclare = (state: MatchState, seat: SeatIndex, tile: Tile): MatchState => {
  const player = state.players[seat];
  if (player.drawnTile === null) {
    throw new Error("加槓するツモ牌が無い");
  }
  const withPendingDecision: MatchState = {
    ...state,
    players: state.players.map((p, s) => (s === seat ? { ...p, hasDrawnThisKyoku: true } : p)) as [
      PlayerState,
      PlayerState,
      PlayerState,
      PlayerState,
    ],
  };
  const eligible = eligibleRespondersFor(withPendingDecision, { kind: "chankan", sourceSeat: seat, tile });
  return {
    ...withPendingDecision,
    phase: { type: "claims", kind: "chankan", sourceSeat: seat, tile, eligible, responses: [] },
  };
};

const applyKan = (state: MatchState, seat: SeatIndex, tile: Tile): MatchState => {
  assertTurnActor(state, seat);
  if (ankanCandidates(state, seat).some((t) => Tile.equals(t, tile))) {
    return applyAnkan(state, seat, tile);
  }
  if (kakanCandidates(state, seat).some((t) => Tile.equals(t, tile))) {
    return applyKakanDeclare(state, seat, tile);
  }
  throw new Error(`カンとして不正な牌: ${Tile.format(tile)}`);
};

export const applyTurnAction = (state: MatchState, action: GameAction): MatchState => {
  if (action.type === "discard") {
    return applyDiscard(state, action.seat, action.tile, action.riichi);
  }
  if (action.type === "tsumo") {
    return applyTsumo(state, action.seat);
  }
  if (action.type === "kan") {
    return applyKan(state, action.seat, action.tile);
  }
  throw new Error(`turnフェーズでは扱えないアクション: ${action.type}`);
};
