import type { MatchLength } from "./round";
import { Seats, type SeatIndex } from "./seat";

/** 操作種別 */
export type PlayerType = "human" | "cpu";

/** CPUレベル(入門/標準/上級) */
export type CpuLevel = "beginner" | "standard" | "advanced";

/** 1席分のプレイヤー設定 */
export type PlayerConfig = Readonly<{
  name: string;
  type: PlayerType;
  cpuLevel: CpuLevel;
}>;

/** ルール設定 */
export type RuleConfig = Readonly<{
  matchLength: MatchLength;
  startingPoints: 25000 | 30000;
  /** 返し点(なし = null) */
  returnPoints: 30000 | null;
  kuitan: boolean;
  atozuke: boolean;
  akaDora: boolean;
  cpuAutoWin: boolean;
}>;

/** 対戦開始設定(プレイヤー4席 + ルール) */
export type MatchSetup = Readonly<{
  players: Seats<PlayerConfig>;
  rules: RuleConfig;
}>;

const defaultPlayer = (seat: SeatIndex): PlayerConfig => ({
  name: `プレイヤー${seat + 1}`,
  type: seat === 0 ? "human" : "cpu",
  cpuLevel: "standard",
});

export const MatchSetup = {
  /** 仕様の初期値(半荘戦・25,000点持ち・返し30,000点・各種ルールあり)で生成する */
  createDefault(): MatchSetup {
    return {
      players: Seats.map([0, 1, 2, 3] as const, (seat) => defaultPlayer(seat)),
      rules: {
        matchLength: "hanchan",
        startingPoints: 25000,
        returnPoints: 30000,
        kuitan: true,
        atozuke: true,
        akaDora: true,
        cpuAutoWin: true,
      },
    };
  },

  updatePlayer(setup: MatchSetup, seat: SeatIndex, patch: Partial<PlayerConfig>): MatchSetup {
    return {
      ...setup,
      players: Seats.update(setup.players, seat, (player) => ({ ...player, ...patch })),
    };
  },

  updateRules(setup: MatchSetup, patch: Partial<RuleConfig>): MatchSetup {
    return { ...setup, rules: { ...setup.rules, ...patch } };
  },
} as const;
