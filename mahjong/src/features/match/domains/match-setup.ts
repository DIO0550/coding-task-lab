import type {
  CpuLevel,
  OperatorKind,
  PlayerConfig,
  RuleConfig,
  Seat,
} from "../../../domains/game/index.ts";

/**
 * 対戦開始前の1席分の設定。
 * level は CPU のときだけ意味を持つ(人間へ切り替えても直前の選択を保持する)
 */
export type SeatSetup = Readonly<{
  kind: OperatorKind;
  name: string;
  level: CpuLevel;
}>;

/** 対戦開始前の設定一式(4席分 + ルール) */
export type MatchSetup = Readonly<{
  seats: readonly SeatSetup[];
  rule: RuleConfig;
}>;

/** 既定: 席0=人間「あなた」、席1-3=CPU(標準) */
const DEFAULT_SEATS: readonly SeatSetup[] = [
  { kind: "human", name: "あなた", level: "standard" },
  { kind: "cpu", name: "CPU1", level: "standard" },
  { kind: "cpu", name: "CPU2", level: "standard" },
  { kind: "cpu", name: "CPU3", level: "standard" },
];

/** 既定ルール(spec-match-screen の初期値) */
const DEFAULT_RULE: RuleConfig = {
  format: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: true,
  cpuAutoWin: true,
};

export const MatchSetup = {
  /** 既定の設定(半荘戦・25000点持ち・席0が人間) */
  createDefault(): MatchSetup {
    return { seats: DEFAULT_SEATS, rule: DEFAULT_RULE };
  },

  /** 1席分の設定を部分更新した新しい設定を返す */
  updateSeat(
    setup: MatchSetup,
    seat: Seat,
    patch: Partial<SeatSetup>,
  ): MatchSetup {
    return {
      ...setup,
      seats: setup.seats.map((item, index) =>
        index === seat ? { ...item, ...patch } : item,
      ),
    };
  },

  /** ルールを部分更新した新しい設定を返す */
  updateRule(setup: MatchSetup, patch: Partial<RuleConfig>): MatchSetup {
    return { ...setup, rule: { ...setup.rule, ...patch } };
  },

  /** Game.start へ渡すプレイヤー設定(人間の level は null にする) */
  toPlayers(setup: MatchSetup): readonly PlayerConfig[] {
    return setup.seats.map((seat) => ({
      kind: seat.kind,
      name: seat.name,
      level: seat.kind === "cpu" ? seat.level : null,
    }));
  },
} as const;
