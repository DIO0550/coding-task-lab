import { useCallback, useReducer } from "react";

import type { CpuLevel, MatchConfig, PlayerConfig, RuleSet, SeatIndex } from "@/src/domains/game/index.ts";

import type { SetupAction } from "../types/index.ts";
import { createDefaultMatchConfig } from "../utils/default-config.ts";

const DEFAULT_CPU_LEVEL: CpuLevel = "standard";

const updatePlayer = (
  players: MatchConfig["players"],
  seat: SeatIndex,
  update: (p: PlayerConfig) => PlayerConfig,
): MatchConfig["players"] =>
  players.map((p, s) => (s === seat ? update(p) : p)) as unknown as MatchConfig["players"];

/** 対戦開始設定フォームの純粋な状態遷移。ドメイン知識(ルールの妥当性判定等)は持たず、値の更新のみ行う。 */
const setupReducer = (config: MatchConfig, action: SetupAction): MatchConfig => {
  switch (action.type) {
    case "set_player_kind":
      return {
        ...config,
        players: updatePlayer(config.players, action.seat, (p) => ({
          ...p,
          kind: action.kind,
          cpuLevel: action.kind === "cpu" ? (p.cpuLevel ?? DEFAULT_CPU_LEVEL) : null,
        })),
      };
    case "set_player_name":
      return {
        ...config,
        players: updatePlayer(config.players, action.seat, (p) => ({ ...p, name: action.name })),
      };
    case "set_player_cpu_level":
      return {
        ...config,
        players: updatePlayer(config.players, action.seat, (p) => ({ ...p, cpuLevel: action.level })),
      };
    case "set_rule":
      return { ...config, rules: { ...config.rules, ...action.rule } };
    default:
      return config;
  }
};

/** 対戦開始設定画面の headless フック。状態(config)と更新ハンドラのみを返し、JSX は返さない。 */
export const useMatchSetup = () => {
  const [config, dispatch] = useReducer(setupReducer, undefined, createDefaultMatchConfig);

  const setPlayerKind = useCallback((seat: SeatIndex, kind: "human" | "cpu") => {
    dispatch({ type: "set_player_kind", seat, kind });
  }, []);

  const setPlayerName = useCallback((seat: SeatIndex, name: string) => {
    dispatch({ type: "set_player_name", seat, name });
  }, []);

  const setPlayerCpuLevel = useCallback((seat: SeatIndex, level: CpuLevel) => {
    dispatch({ type: "set_player_cpu_level", seat, level });
  }, []);

  const setRule = useCallback((rule: Partial<RuleSet>) => {
    dispatch({ type: "set_rule", rule });
  }, []);

  return { config, setPlayerKind, setPlayerName, setPlayerCpuLevel, setRule };
};
