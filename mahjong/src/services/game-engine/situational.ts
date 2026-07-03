import { Wall } from "../../domains/game/index.ts";
import type { MatchState, SeatIndex } from "../../domains/game/index.ts";
import type { Situational } from "../../domains/win-context/index.ts";

/** ツモ和了時の状況役(海底・嶺上・天和・地和)を判定する。呼び出し時点の phase が turn であること。 */
export const tsumoSituational = (state: MatchState, seat: SeatIndex): readonly Situational[] => {
  if (state.phase.type !== "turn" || state.phase.actor !== seat) {
    throw new Error("ツモ和了はturnフェーズの手番者のみ評価できる");
  }
  const result: Situational[] = [];

  if (state.phase.drawSource === "rinshan") {
    result.push("rinshan");
  } else if (Wall.remaining(state) === 0) {
    result.push("haitei");
  }

  const player = state.players[seat];
  if (!player.hasDrawnThisKyoku && !state.anyCallHappened) {
    result.push(seat === state.dealerSeat ? "tenhou" : "chihou");
  }

  return result;
};

/** ロン和了時の状況役(河底・槍槓)を判定する。 */
export const ronSituational = (
  state: MatchState,
  kind: "discard" | "chankan",
): readonly Situational[] => {
  if (kind === "chankan") {
    return ["chankan"];
  }
  return Wall.remaining(state) === 0 ? ["houtei"] : [];
};
