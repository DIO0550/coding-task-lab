import { Wall } from "../../domains/game/index.ts";
import type { GameView, GameViewPlayer, MatchState, SeatIndex } from "../../domains/game/index.ts";
import { legalActions } from "./legal-actions.ts";

export const viewFor = (state: MatchState, seat: SeatIndex): GameView => {
  const self = state.players[seat];

  const players = state.players.map((p, s): GameViewPlayer => ({
    seat: s as SeatIndex,
    river: p.river,
    melds: p.melds,
    score: p.score,
    riichi: p.riichi,
    handCount: p.hand.length + (p.drawnTile !== null ? 1 : 0),
  })) as [GameViewPlayer, GameViewPlayer, GameViewPlayer, GameViewPlayer];

  const ownActions = legalActions(state).filter((a) => a.seat === seat);

  return {
    seat,
    hand: self.hand,
    drawnTile: self.drawnTile,
    players,
    doraIndicators: Wall.doraIndicators(state),
    remainingWallCount: Wall.remaining(state),
    roundWind: state.roundWind,
    kyokuNumber: state.kyokuNumber,
    honba: state.honba,
    kyotaku: state.kyotaku,
    dealerSeat: state.dealerSeat,
    phase: state.phase.type,
    legalActions: ownActions,
    roundEndResult: state.phase.type === "round_end" ? state.phase.result : null,
    ranking: state.phase.type === "match_end" ? state.phase.ranking : null,
  };
};
