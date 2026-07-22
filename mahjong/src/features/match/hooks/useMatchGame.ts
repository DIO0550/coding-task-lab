"use client";

import { useReducer, useEffect, useState, useCallback } from "react";
import { GameService } from "../../../services/game-service/index.ts";
import type { GameState, RuleConfig, PlayerConfig, ActionOption } from "../../../types/game.ts";

const initialRules: RuleConfig = {
  length: "hanchan",
  initialScore: 25000,
  returnScore: 30000,
  kuiTan: true,
  atoZuke: true,
  akaDora: true,
  cpuAutoWin: true,
};

const initialPlayerConfigs: PlayerConfig[] = [
  { type: "human", name: "あなた", cpuLevel: "standard" },
  { type: "cpu", name: "CPU 下家", cpuLevel: "standard" },
  { type: "cpu", name: "CPU 対面", cpuLevel: "standard" },
  { type: "cpu", name: "CPU 上家", cpuLevel: "standard" },
];

type GameAction =
  | { type: "INIT"; rules: RuleConfig; playerConfigs: readonly PlayerConfig[] }
  | { type: "START" }
  | { type: "EXECUTE_ACTION"; playerIndex: number; action: ActionOption }
  | { type: "STEP_CPU" }
  | { type: "NEXT_ROUND" }
  | { type: "RESET" };

function matchReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INIT": {
      return GameService.createInitialState(action.rules, action.playerConfigs);
    }
    case "START": {
      return GameService.startMatch(state);
    }
    case "EXECUTE_ACTION": {
      return GameService.handleAction(state, action.playerIndex, action.action);
    }
    case "STEP_CPU": {
      return GameService.stepCpuTurn(state);
    }
    case "NEXT_ROUND": {
      return GameService.advanceToNextRound(state);
    }
    case "RESET": {
      return GameService.createInitialState(state.rules, state.players.map((p) => ({
        type: p.type,
        name: p.name,
        cpuLevel: p.cpuLevel,
      })));
    }
    default:
      return state;
  }
}

export function useMatchGame() {
  const [rules, setRules] = useState<RuleConfig>(initialRules);
  const [playerConfigs, setPlayerConfigs] = useState<readonly PlayerConfig[]>(initialPlayerConfigs);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  const [gameState, dispatch] = useReducer(
    matchReducer,
    null,
    () => GameService.createInitialState(initialRules, initialPlayerConfigs)
  );

  const startMatch = useCallback(() => {
    dispatch({ type: "INIT", rules, playerConfigs });
    dispatch({ type: "START" });
    setSelectedTile(null);
  }, [rules, playerConfigs]);

  const handleAction = useCallback(
    (playerIndex: number, action: ActionOption) => {
      dispatch({ type: "EXECUTE_ACTION", playerIndex, action });
      setSelectedTile(null);
    },
    []
  );

  const nextRound = useCallback(() => {
    dispatch({ type: "NEXT_ROUND" });
    setSelectedTile(null);
  }, []);

  const resetToSetup = useCallback(() => {
    dispatch({ type: "RESET" });
    setSelectedTile(null);
  }, []);

  useEffect(() => {
    if (gameState.phase === "turn_discard") {
      const activePlayer = gameState.players[gameState.table.currentTurnIndex];
      if (activePlayer && activePlayer.type === "cpu") {
        const timer = setTimeout(() => {
          dispatch({ type: "STEP_CPU" });
        }, 600);
        return () => clearTimeout(timer);
      }
    }

    if (gameState.phase === "response_phase" && gameState.pendingResponses) {
      const allCpus = gameState.pendingResponses.every(
        (r) => gameState.players[r.playerIndex].type === "cpu"
      );
      if (allCpus) {
        const timer = setTimeout(() => {
          dispatch({ type: "STEP_CPU" });
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.phase, gameState.table.currentTurnIndex, gameState.pendingResponses, gameState.players]);

  return {
    gameState,
    rules,
    setRules,
    playerConfigs,
    setPlayerConfigs,
    selectedTile,
    setSelectedTile,
    startMatch,
    handleAction,
    nextRound,
    resetToSetup,
  };
}
