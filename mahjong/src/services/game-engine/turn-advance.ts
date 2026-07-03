import { Wall } from "../../domains/game/index.ts";
import type { MatchState, PlayerState, SeatIndex } from "../../domains/game/index.ts";
import { resolveRyuukyoku } from "./ryuukyoku.ts";

/** 通常のツモ(嶺上ではない)を seat のために引く。山が尽きていれば荒牌流局にする。 */
export const drawForSeat = (state: MatchState, seat: SeatIndex): MatchState => {
  if (Wall.remaining(state) === 0) {
    return resolveRyuukyoku(state);
  }
  const tile = Wall.nextLiveTile(state);
  const nextPlayers = state.players.map((p, s) =>
    s === seat ? { ...p, drawnTile: tile, temporaryFuriten: false } : p,
  ) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players: nextPlayers,
    drawIndex: state.drawIndex + 1,
    phase: { type: "turn", actor: seat, drawSource: "wall" },
  };
};
