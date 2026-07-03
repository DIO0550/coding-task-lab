import { Seat } from "../../domains/game/index.ts";
import type { LegalAction, MatchState, SeatIndex } from "../../domains/game/index.ts";
import type { Tile } from "../../domains/tile/index.ts";
import { isFuriten } from "./furiten.ts";
import { canDaiminkan } from "./kan-ops.ts";
import { isWinningWithYaku } from "./score-input.ts";
import { ronSituational } from "./situational.ts";
import { chiOptionsFor, countMatching } from "./tile-ops.ts";

export type ClaimTarget = Readonly<{
  kind: "discard" | "chankan";
  sourceSeat: SeatIndex;
  tile: Tile;
}>;

/** 打牌(または加槓の対象牌)に対して、指定した席が宣言できる行動一覧(パスも含む)。 */
export const claimOptionsForSeat = (
  state: MatchState,
  seat: SeatIndex,
  target: ClaimTarget,
): readonly LegalAction[] => {
  const actions: LegalAction[] = [];
  const situational = ronSituational(state, target.kind);
  const canRon =
    !isFuriten(state, seat) &&
    isWinningWithYaku(state, { seat, winTile: target.tile, winType: "ron", situational });

  if (canRon) {
    actions.push({ type: "ron", seat });
  }

  if (target.kind === "chankan") {
    if (actions.length > 0) {
      actions.push({ type: "pass", seat });
    }
    return actions;
  }

  const hand = state.players[seat].hand;
  if (canDaiminkan(state, seat, target.tile)) {
    actions.push({ type: "kan", seat, tiles: [target.tile] });
  }
  if (countMatching(hand, target.tile) >= 2) {
    actions.push({ type: "pon", seat });
  }
  if (seat === Seat.shimocha(target.sourceSeat)) {
    const options = chiOptionsFor(target.tile, hand);
    if (options.length > 0) {
      actions.push({ type: "chi", seat, options });
    }
  }
  if (actions.length > 0) {
    actions.push({ type: "pass", seat });
  }
  return actions;
};

/** 打牌(または槍槓)に応答しうる席の一覧(パス以外の選択肢を1つでも持つ席)。 */
export const eligibleRespondersFor = (
  state: MatchState,
  target: ClaimTarget,
): readonly SeatIndex[] =>
  Seat.others(target.sourceSeat).filter(
    (seat) => claimOptionsForSeat(state, seat, target).length > 0,
  );
