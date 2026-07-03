import { Scoring } from "@/src/domains/scoring";
import { parseScoringInput } from "./parse-input";

export type ScoreCalculatorOutput =
  | Readonly<{
      valid: true;
      yaku: readonly Readonly<{ name: string; han: number }>[];
      han: number;
      fu: number;
      score: Readonly<{
        total: number;
        payments: readonly Readonly<{ from: string; amount: number }>[];
      }>;
    }>
  | Readonly<{
      valid: false;
      reason: "no_yaku" | "not_winning_hand" | "invalid_input";
    }>;

export const ScoreCalculator = {
  /** 入力JSON文字列を検証・計算し、出力契約どおりのオブジェクトを返す */
  calculateFromJson(jsonText: string): ScoreCalculatorOutput {
    const parsed = ((): unknown => {
      try {
        return JSON.parse(jsonText) as unknown;
      } catch {
        return undefined;
      }
    })();
    if (parsed === undefined) {
      return { valid: false, reason: "invalid_input" };
    }
    return ScoreCalculator.calculate(parsed);
  },

  /** パース済みJSON値(unknown)を検証・計算する */
  calculate(value: unknown): ScoreCalculatorOutput {
    const input = parseScoringInput(value);
    if (input === null) {
      return { valid: false, reason: "invalid_input" };
    }
    const result = Scoring.calculate(input);
    if (!result.valid) {
      return { valid: false, reason: result.reason };
    }
    return {
      valid: true,
      yaku: result.yaku,
      han: result.han,
      fu: result.fu,
      score: result.score,
    };
  },
} as const;
