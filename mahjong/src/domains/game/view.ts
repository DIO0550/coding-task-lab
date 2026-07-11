import { Wall } from "../wall/index.ts";
import type { GameState, PlayerView, PublicPlayer, Seat } from "./types.ts";
import { windOfSeat } from "./types.ts";
import { legalActionsOf } from "./legal.ts";

/** 全席分の公開情報(手牌の中身は含まない) */
const publicPlayers = (state: GameState): readonly PublicPlayer[] =>
  state.players.map((player) => ({
    seat: player.seat,
    name: player.config.name,
    wind: windOfSeat(state.dealer, player.seat),
    points: player.points,
    isDealer: player.seat === state.dealer,
    melds: player.melds,
    discards: player.discards,
    riichi: player.riichi,
    handCount: player.hand.length + (player.drawn === null ? 0 : 1),
  }));

/** seat から見た卓面。他家の手牌・山の中身は含まれない */
export const viewForSeat = (state: GameState, seat: Seat): PlayerView => {
  const self = state.players[seat];
  return {
    self: seat,
    hand: self.hand,
    drawn: self.drawn,
    melds: self.melds,
    players: publicPlayers(state),
    doraIndicators: state.wall.doraIndicators,
    roundWind: state.roundWind,
    roundNumber: state.roundNumber,
    honba: state.honba,
    riichiSticks: state.riichiSticks,
    wallRemaining: Wall.remaining(state.wall),
    phase: state.phase,
    lastDiscard: state.lastDiscard,
    legalActions: legalActionsOf(state, seat),
  };
};
