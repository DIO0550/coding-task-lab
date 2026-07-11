import { useReducer, useEffect, useCallback } from "react";
import { GameState, GameRule, PlayerId, GameEngine, GameAI, GameAction, PlayerState } from "@/domains/game";
import { Tile } from "@/domains/mahjong";

type MatchAction =
  | { type: "SETUP_GAME"; rule: GameRule; playerConfigs: readonly { id: PlayerId; name: string; isCpu: boolean; cpuLevel: "easy" | "normal" | "hard" }[] }
  | { type: "START_GAME" }
  | { type: "DISCARD"; playerId: PlayerId; tile: Tile; riichi?: boolean }
  | { type: "TSUMO"; playerId: PlayerId }
  | { type: "REACTION"; playerId: PlayerId; action: GameAction }
  | { type: "ADVANCE_ROUND" }
  | { type: "RESET" };

function matchReducer(state: GameState, action: MatchAction): GameState {
  switch (action.type) {
    case "SETUP_GAME":
      return GameEngine.startRound(GameEngine.initialGameState(action.rule, action.playerConfigs));
    case "START_GAME":
      return GameEngine.startRound(state);
    case "DISCARD":
      return GameEngine.discardTile(state, action.playerId, action.tile, action.riichi);
    case "TSUMO":
      return GameEngine.declareTsumo(state, action.playerId);
    case "REACTION":
      return GameEngine.submitReaction(state, action.playerId, action.action);
    case "ADVANCE_ROUND":
      return GameEngine.advanceRound(state);
    case "RESET":
      return { ...state, phase: "setup" };
    default:
      return state;
  }
}

export function useMatch() {
  const initialRule: GameRule = {
    length: "hanchan",
    startScore: 25000,
    returnScore: 30000,
    kuitan: true,
    atozuke: true,
    redDora: true,
    cpuAutoWin: true
  };

  const initialConfigs = [
    { id: "player" as PlayerId, name: "自分", isCpu: false, cpuLevel: "easy" as const },
    { id: "cpu1" as PlayerId, name: "CPU1", isCpu: true, cpuLevel: "easy" as const },
    { id: "cpu2" as PlayerId, name: "CPU2", isCpu: true, cpuLevel: "normal" as const },
    { id: "cpu3" as PlayerId, name: "CPU3", isCpu: true, cpuLevel: "hard" as const }
  ];

  const [state, dispatch] = useReducer(
    matchReducer,
    GameEngine.initialGameState(initialRule, initialConfigs)
  );

  // CPU Automatic turn progression effect
  useEffect(() => {
    if (state.phase === "playerDraw") {
      const activePlayer = state.players[state.currentTurn];
      if (activePlayer.isCpu) {
        const timer = setTimeout(() => {
          const action = GameAI.getAction(state, activePlayer.id);
          if (action.type === "tsumo") {
            dispatch({ type: "TSUMO", playerId: activePlayer.id });
          } else if (action.type === "riichi") {
            dispatch({ type: "DISCARD", playerId: activePlayer.id, tile: action.tile, riichi: true });
          } else if (action.type === "discard") {
            dispatch({ type: "DISCARD", playerId: activePlayer.id, tile: action.tile });
          } else if (action.type === "kan") {
            // Concealed/Added Kan: treat as discard for simplicity if not fully resolved
            dispatch({ type: "DISCARD", playerId: activePlayer.id, tile: action.targetTile });
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }

    if (state.phase === "discardReaction") {
      const missingCpus = state.players.filter(
        p => p.isCpu && state.reactionDecisions[p.id] === null
      );

      if (missingCpus.length > 0) {
        const timer = setTimeout(() => {
          missingCpus.forEach(cpu => {
            const action = GameAI.getAction(state, cpu.id);
            dispatch({ type: "REACTION", playerId: cpu.id, action });
          });
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [state]);

  const setupGame = useCallback((
    rule: GameRule,
    playerConfigs: readonly { id: PlayerId; name: string; isCpu: boolean; cpuLevel: "easy" | "normal" | "hard" }[]
  ) => {
    dispatch({ type: "SETUP_GAME", rule, playerConfigs });
  }, []);

  const startGame = useCallback(() => {
    dispatch({ type: "START_GAME" });
  }, []);

  const discard = useCallback((tile: Tile) => {
    dispatch({ type: "DISCARD", playerId: "player", tile });
  }, []);

  const declareRiichi = useCallback((tile: Tile) => {
    dispatch({ type: "DISCARD", playerId: "player", tile, riichi: true });
  }, []);

  const declareTsumo = useCallback(() => {
    dispatch({ type: "TSUMO", playerId: "player" });
  }, []);

  const submitReaction = useCallback((action: GameAction) => {
    dispatch({ type: "REACTION", playerId: "player", action });
  }, []);

  const advanceRound = useCallback(() => {
    dispatch({ type: "ADVANCE_ROUND" });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    setupGame,
    startGame,
    discard,
    declareRiichi,
    declareTsumo,
    submitReaction,
    advanceRound,
    resetGame
  };
}
