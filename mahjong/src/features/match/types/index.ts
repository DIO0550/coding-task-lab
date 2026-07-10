import type { CpuLevel, RuleSet, SeatIndex } from "@/src/domains/game/index.ts";

/** 対戦開始設定フォームの更新アクション(useMatchSetup の reducer が解釈する)。 */
export type SetupAction =
  | Readonly<{ type: "set_player_kind"; seat: SeatIndex; kind: "human" | "cpu" }>
  | Readonly<{ type: "set_player_name"; seat: SeatIndex; name: string }>
  | Readonly<{ type: "set_player_cpu_level"; seat: SeatIndex; level: CpuLevel }>
  | Readonly<{ type: "set_rule"; rule: Partial<RuleSet> }>;
