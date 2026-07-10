import { Hand } from "../../domains/hand/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { MatchState, SeatIndex } from "../../domains/game/index.ts";

/** seat の現在の手牌(副露を除く)に対する待ち牌一覧。 */
export const waitingTilesOf = (state: MatchState, seat: SeatIndex) => {
  const player = state.players[seat];
  return Hand.waitingTiles(player.hand, player.melds);
};

/** 自河に現在の待ち牌が含まれているか(見た目上のフリテン)。 */
const riverContainsWait = (state: MatchState, seat: SeatIndex): boolean => {
  const wait = waitingTilesOf(state, seat);
  if (wait.length === 0) {
    return false;
  }
  const player = state.players[seat];
  return player.river.some((entry) => wait.some((w) => Tile.equals(w, entry.tile)));
};

/** ロン不可のフリテン状態か(自河に待ち牌がある / 一時フリテン / 永続フリテン)。 */
export const isFuriten = (state: MatchState, seat: SeatIndex): boolean => {
  const player = state.players[seat];
  return player.temporaryFuriten || player.permanentFuriten || riverContainsWait(state, seat);
};
