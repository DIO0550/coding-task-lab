import type { Wind } from "@/src/domains/wind";
import type { ScoringRules } from "@/src/types/scoring";

/**
 * 対戦開始時に選択するルール設定(docs/spec-match-screen.md「ルール設定」)。
 */
export type GameLength = "tonpuu" | "hanchan";
export type StartingPoints = 25000 | 30000;
export type ReturnPoints = 30000 | null;

export type RuleConfig = Readonly<{
  gameLength: GameLength;
  startingPoints: StartingPoints;
  returnPoints: ReturnPoints;
  kuitan: boolean;
  atozuke: boolean;
  akaDora: boolean;
  cpuAutoWin: boolean;
}>;

const DEFAULT: RuleConfig = {
  gameLength: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: true,
  cpuAutoWin: true,
};

export const RuleConfig = {
  default(): RuleConfig {
    return DEFAULT;
  },

  with(config: RuleConfig, patch: Partial<RuleConfig>): RuleConfig {
    return { ...config, ...patch };
  },

  toScoringRules(config: RuleConfig): ScoringRules {
    return { kuitan: config.kuitan, atozuke: config.atozuke };
  },

  /** 最終局の場風(東風戦は東、半荘戦は南) */
  lastRoundWind(config: RuleConfig): Wind {
    return config.gameLength === "tonpuu" ? "ton" : "nan";
  },

  /** オカ(返し点と持ち点の差 × 4)。返し点なしなら 0 */
  oka(config: RuleConfig): number {
    return config.returnPoints === null ? 0 : (config.returnPoints - config.startingPoints) * 4;
  },
} as const;
