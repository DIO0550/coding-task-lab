import { useEffect, useReducer } from "react";
import {
  Game,
  type GameAction,
  type GameConfig,
  type GameState,
} from "@/src/services/game";
import { Timer } from "@/src/libs/timer";
import { Random } from "@/src/libs/random";
import { nextAutoAction } from "../utils/flow";
import { runWithRng } from "../utils/rng";

export type MatchState =
  | Readonly<{ stage: "setup" }>
  | Readonly<{
      stage: "playing";
      game: GameState;
      rngState: number;
      riichiSelecting: boolean;
    }>;

export type MatchDispatchAction =
  | Readonly<{ type: "start"; config: GameConfig; seed: number }>
  | Readonly<{ type: "game"; action: GameAction }>
  | Readonly<{ type: "auto" }>
  | Readonly<{ type: "set_riichi_selecting"; value: boolean }>
  | Readonly<{ type: "reset" }>;

const initialState: MatchState = { stage: "setup" };

/** reducer はアクションの解釈に徹し、進行・判断は services(Game/Cpu)へ委譲する */
const matchReducer = (
  state: MatchState,
  action: MatchDispatchAction,
): MatchState => {
  switch (action.type) {
    case "start": {
      const [game, rngState] = runWithRng(action.seed, (rng) =>
        Game.create(action.config, rng),
      );
      return { stage: "playing", game, rngState, riichiSelecting: false };
    }
    case "game": {
      if (state.stage !== "playing") {
        return state;
      }
      const [game, rngState] = runWithRng(state.rngState, (rng) =>
        Game.apply(state.game, action.action, rng),
      );
      return { stage: "playing", game, rngState, riichiSelecting: false };
    }
    case "auto": {
      if (state.stage !== "playing") {
        return state;
      }
      const auto = nextAutoAction(state.game);
      if (auto === null) {
        return state;
      }
      const [game, rngState] = runWithRng(state.rngState, (rng) =>
        Game.apply(state.game, auto, rng),
      );
      return {
        stage: "playing",
        game,
        rngState,
        riichiSelecting: state.riichiSelecting,
      };
    }
    case "set_riichi_selecting": {
      if (state.stage !== "playing") {
        return state;
      }
      return { ...state, riichiSelecting: action.value };
    }
    case "reset":
      return initialState;
  }
};

export type UseMatchOptions = Readonly<{
  /** 牌山シャッフルのシード(テスト用)。省略時はランダム */
  seed?: number;
  /** CPUの自動行動の遅延(ms)。テストでは0を指定 */
  cpuDelayMs?: number;
}>;

export type UseMatchResult = Readonly<{
  state: MatchState;
  start: (config: GameConfig) => void;
  act: (action: GameAction) => void;
  setRiichiSelecting: (value: boolean) => void;
  reset: () => void;
}>;

export const useMatch = (options: UseMatchOptions = {}): UseMatchResult => {
  const { seed, cpuDelayMs = 700 } = options;
  const [state, dispatch] = useReducer(matchReducer, initialState);

  const game = state.stage === "playing" ? state.game : null;

  useEffect(() => {
    if (game === null || nextAutoAction(game) === null) {
      return;
    }
    return Timer.schedule(() => dispatch({ type: "auto" }), cpuDelayMs);
  }, [game, cpuDelayMs]);

  return {
    state,
    start: (config) =>
      dispatch({
        type: "start",
        config,
        seed: seed ?? Math.floor(Random.create()() * 2147483647),
      }),
    act: (action) => dispatch({ type: "game", action }),
    setRiichiSelecting: (value) =>
      dispatch({ type: "set_riichi_selecting", value }),
    reset: () => dispatch({ type: "reset" }),
  };
};
