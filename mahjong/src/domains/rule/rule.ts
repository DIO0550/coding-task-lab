import { Wind } from "../wind/index.ts";

/** 対戦形式。東風戦・半荘戦。 */
export type MatchLength = "tonpuu" | "hanchan";

/** 対戦ルール設定。 */
export type Rule = Readonly<{
  length: MatchLength;
  /** 開始持ち点。 */
  startingPoints: number;
  /** 返し点。なしの場合は null。 */
  returnPoints: number | null;
  /** 喰いタンあり。 */
  kuitan: boolean;
  /** 後付けあり。 */
  atozuke: boolean;
  /** 赤ドラあり。 */
  redDora: boolean;
  /** CPUが和了可能なとき必ず和了するか。 */
  cpuAutoWin: boolean;
}>;

const DEFAULT_RULE: Rule = {
  length: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  redDora: true,
  cpuAutoWin: true,
};

export const Rule = {
  /** 初期値(半荘戦・25,000点持ち・30,000点返し)。 */
  default(): Rule {
    return DEFAULT_RULE;
  },

  /** 一部の設定だけを差し替えた新しいルール。 */
  with(rule: Rule, changes: Partial<Rule>): Rule {
    return { ...rule, ...changes };
  },

  /** 最終局の場風。 */
  finalRoundWind(rule: Rule): Wind {
    return rule.length === "tonpuu" ? "ton" : "nan";
  },

  /** 最終局(東4局 / 南4局)か。 */
  isFinalRound(rule: Rule, roundWind: Wind, roundNumber: number): boolean {
    return roundWind === Rule.finalRoundWind(rule) && roundNumber >= 4;
  },

  /** その場風が対戦範囲を超えているか。 */
  isBeyondFinalRound(rule: Rule, roundWind: Wind): boolean {
    return Wind.toIndex(roundWind) > Wind.toIndex(Rule.finalRoundWind(rule));
  },
} as const;
