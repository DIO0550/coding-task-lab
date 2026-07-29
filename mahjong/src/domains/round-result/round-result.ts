import type { Score } from "../score/index.ts";
import type { WinType } from "../win-context/index.ts";
import type { Yaku } from "../yaku/index.ts";

/** 和了による局の結果。 */
export type WinResult = Readonly<{
  type: "win";
  winner: number;
  /** ロンの放銃者。ツモは null。 */
  loser: number | null;
  winType: WinType;
  yaku: readonly Yaku[];
  han: number;
  fu: number;
  score: Score;
  /** 4人分の点数増減(供託・本場を含む)。 */
  pointChanges: readonly number[];
  /** 親が継続するか。 */
  dealerContinues: boolean;
}>;

/** 荒牌流局による局の結果。 */
export type ExhaustiveDrawResult = Readonly<{
  type: "exhaustive_draw";
  /** 4人分のテンパイ状況。 */
  tenpai: readonly boolean[];
  /** 4人分の点数増減(ノーテン罰符)。 */
  pointChanges: readonly number[];
  dealerContinues: boolean;
}>;

/** 局の結果。 */
export type RoundResult = WinResult | ExhaustiveDrawResult;

export const RoundResult = {
  /** 和了による結果か。 */
  isWin(result: RoundResult): result is WinResult {
    return result.type === "win";
  },

  /** 親が継続するか。 */
  dealerContinues(result: RoundResult): boolean {
    return result.dealerContinues;
  },

  /** 4人分の点数増減。 */
  pointChanges(result: RoundResult): readonly number[] {
    return result.pointChanges;
  },
} as const;
