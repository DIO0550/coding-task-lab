/** 操作種別。人間かCPUか。 */
export type PlayerKind = "human" | "cpu";

/** CPUの強さ。入門・標準・上級。 */
export type CpuLevel = "beginner" | "standard" | "advanced";

/** 対局参加者の設定。 */
export type Participant = Readonly<{
  name: string;
  kind: PlayerKind;
  level: CpuLevel;
}>;

const CPU_LEVELS: readonly CpuLevel[] = ["beginner", "standard", "advanced"];

const DEFAULT_NAMES: readonly string[] = ["あなた", "CPU下家", "CPU対面", "CPU上家"];

export const Participant = {
  /** 人間プレイヤー。 */
  human(name: string): Participant {
    return { name, kind: "human", level: "standard" };
  },

  /** CPUプレイヤー。 */
  cpu(name: string, level: CpuLevel): Participant {
    return { name, kind: "cpu", level };
  },

  /** CPUか。 */
  isCpu(participant: Participant): boolean {
    return participant.kind === "cpu";
  },

  /** 既定の4人構成(東家が人間、他はCPU標準)。 */
  defaultSeats(): readonly Participant[] {
    return [
      Participant.human(DEFAULT_NAMES[0]),
      Participant.cpu(DEFAULT_NAMES[1], "standard"),
      Participant.cpu(DEFAULT_NAMES[2], "standard"),
      Participant.cpu(DEFAULT_NAMES[3], "standard"),
    ];
  },

  /** CPUレベルとして妥当な文字列か。 */
  isCpuLevel(value: string): value is CpuLevel {
    return CPU_LEVELS.includes(value as CpuLevel);
  },

  /** 選択可能なCPUレベル一覧。 */
  cpuLevels(): readonly CpuLevel[] {
    return CPU_LEVELS;
  },
} as const;
