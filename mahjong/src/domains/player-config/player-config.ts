/**
 * 各席のプレイヤー設定(docs/spec-match-screen.md「プレイヤー設定」)。
 */
export type PlayerKind = "human" | "cpu";
export type CpuLevel = "beginner" | "standard" | "advanced";

export type PlayerConfig = Readonly<{
  name: string;
  kind: PlayerKind;
  level: CpuLevel;
}>;

const LEVELS: readonly CpuLevel[] = ["beginner", "standard", "advanced"];

export const PlayerConfig = {
  human(name: string): PlayerConfig {
    return { name, kind: "human", level: "standard" };
  },

  cpu(name: string, level: CpuLevel): PlayerConfig {
    return { name, kind: "cpu", level };
  },

  /** 席0が人間、席1〜3が標準 CPU の初期構成 */
  defaults(): readonly PlayerConfig[] {
    return [
      PlayerConfig.human("あなた"),
      PlayerConfig.cpu("CPU 1", "standard"),
      PlayerConfig.cpu("CPU 2", "standard"),
      PlayerConfig.cpu("CPU 3", "standard"),
    ];
  },

  levels(): readonly CpuLevel[] {
    return LEVELS;
  },

  isHuman(player: PlayerConfig): boolean {
    return player.kind === "human";
  },

  isCpu(player: PlayerConfig): boolean {
    return player.kind === "cpu";
  },
} as const;
