import { Hand } from "../../domains/hand/index.ts";
import type { Tile } from "../../domains/tile/index.ts";
import { Wall } from "../../domains/game/index.ts";
import type { MatchState, SeatIndex } from "../../domains/game/index.ts";
import { distinctByStrict, removeExact } from "./tile-ops.ts";

const MIN_SCORE_FOR_RIICHI = 1000;
const MIN_WALL_FOR_RIICHI = 4;

/** 副露が全て(ankan除く)無く門前であるか。 */
export const isMenzen = (state: MatchState, seat: SeatIndex): boolean =>
  state.players[seat].melds.every((m) => m.type === "ankan");

/** リーチ宣言時に切れる牌(切った後にテンパイを維持できるもの)。条件を満たさなければ空配列。 */
export const riichiCandidates = (state: MatchState, seat: SeatIndex): readonly Tile[] => {
  const player = state.players[seat];
  if (
    player.riichi !== "none" ||
    !isMenzen(state, seat) ||
    player.score < MIN_SCORE_FOR_RIICHI ||
    Wall.remaining(state) < MIN_WALL_FOR_RIICHI ||
    player.drawnTile === null
  ) {
    return [];
  }
  const pool = [...player.hand, player.drawnTile];
  return distinctByStrict(pool).filter((tile) => {
    const after = removeExact(pool, tile);
    return Hand.isTenpai(after, player.melds.length);
  });
};
