import { ScoreCalculation } from "../score-calculation/index.ts";
import { ScoreRequest } from "./request/index.ts";
import { ScoreResponse } from "./response/index.ts";
import type { ScoreResponse as ScoreResponseType } from "./response/index.ts";

/** 点数計算エンジンの入出力(CLI契約)。 */
export const ScoreIo = {
  /** 入力JSON文字列から出力JSON相当のオブジェクトを求める。 */
  evaluate(text: string): ScoreResponseType {
    const request = ScoreRequest.fromJson(text);
    if (request === null) {
      return ScoreResponse.invalid("invalid_input");
    }
    return ScoreResponse.fromOutcome(
      ScoreCalculation.calculate(request.hand, request.context),
    );
  },

  /** 入力JSON文字列から出力JSON文字列を求める。 */
  evaluateToJson(text: string): string {
    return JSON.stringify(ScoreIo.evaluate(text));
  },
} as const;
