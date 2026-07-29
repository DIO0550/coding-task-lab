import type { PayerRole, ScoreLimit } from "../../../domains/score/index.ts";
import type { YakuName } from "../../../domains/yaku/index.ts";
import type { ScoreOutcome } from "../../score-calculation/index.ts";

/** 和了不成立の理由。 */
export type InvalidReason = "no_yaku" | "not_winning_hand" | "invalid_input";

/** 和了時の出力。 */
export type ScoreSuccessResponse = Readonly<{
  valid: true;
  yaku: readonly Readonly<{ name: YakuName; han: number }>[];
  han: number;
  fu: number;
  score: Readonly<{
    total: number;
    limit: ScoreLimit;
    payments: readonly Readonly<{ from: PayerRole; amount: number }>[];
  }>;
}>;

/** 和了不成立時の出力。 */
export type ScoreFailureResponse = Readonly<{
  valid: false;
  reason: InvalidReason;
}>;

/** CLIの出力JSON。 */
export type ScoreResponse = ScoreSuccessResponse | ScoreFailureResponse;

export const ScoreResponse = {
  /** 和了不成立の出力。 */
  invalid(reason: InvalidReason): ScoreFailureResponse {
    return { valid: false, reason };
  },

  /** 点数計算の結果を出力形式へ変換する。 */
  fromOutcome(outcome: ScoreOutcome): ScoreResponse {
    if (outcome.type === "no_yaku") {
      return ScoreResponse.invalid("no_yaku");
    }
    if (outcome.type === "not_winning_hand") {
      return ScoreResponse.invalid("not_winning_hand");
    }
    const { result } = outcome;
    return {
      valid: true,
      yaku: result.yaku.map((entry) => ({ name: entry.name, han: entry.han })),
      han: result.han,
      fu: result.fu,
      score: {
        total: result.score.total,
        limit: result.score.limit,
        payments: result.score.payments.map((payment) => ({
          from: payment.from,
          amount: payment.amount,
        })),
      },
    };
  },
} as const;
