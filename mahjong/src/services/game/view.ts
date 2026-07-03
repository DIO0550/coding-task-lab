import type {
  GameState,
  Phase,
  PlayerView,
  PublicPlayer,
} from "@/src/domains/game";
import { seatWindOf } from "./state";

/** claims フェーズの options / responses を自席の分だけに絞る */
const maskPhase = (phase: Phase, seat: number): Phase => {
  if (phase.type !== "claims") {
    return phase;
  }
  return {
    ...phase,
    options: phase.options.filter((option) => option.player === seat),
    responses: phase.responses.map((response, index) =>
      index === seat ? response : null,
    ),
  };
};

/** 指定席から見える情報のみを持つビューを作る(他家の手牌・牌山は隠す) */
export const playerView = (state: GameState, seat: number): PlayerView => {
  const player = state.players[seat];
  const players: readonly PublicPlayer[] = state.players.map(
    (current, index) => ({
      name: state.config.players[index].name,
      kind: state.config.players[index].kind,
      seatWind: seatWindOf(state, index),
      isDealer: index === state.dealer,
      handCount: current.hand.length,
      hasDrawn: current.drawn !== null,
      melds: current.melds,
      discards: current.discards,
      riichi: current.riichi,
      riichiTileIndex: current.riichiTileIndex,
      points: current.points,
    }),
  );
  return {
    seat,
    seatWind: seatWindOf(state, seat),
    dealer: state.dealer,
    rules: state.config.rules,
    round: state.round,
    wallCount: state.wallCount,
    doraIndicators: state.doraIndicators,
    turnCount: state.turnCount,
    ownHand: player.hand,
    ownDrawn: player.drawn,
    ownFuriten: player.furiten,
    players,
    phase: maskPhase(state.phase, seat),
  };
};
