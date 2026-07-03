import { useReducer } from "react";
import {
  MatchSetup,
  MatchState,
  type PlayerConfig,
  type RuleConfig,
  type SeatIndex,
  type WinDeclaration,
} from "../domains";

/** 対戦画面のフェーズ状態(設定中 → 対戦中) */
export type MatchPhaseState =
  | Readonly<{ phase: "setup"; setup: MatchSetup }>
  | Readonly<{ phase: "playing"; match: MatchState }>;

type MatchAction =
  | Readonly<{ type: "player_updated"; seat: SeatIndex; patch: Partial<PlayerConfig> }>
  | Readonly<{ type: "rules_updated"; patch: Partial<RuleConfig> }>
  | Readonly<{ type: "match_started" }>
  | Readonly<{ type: "win_applied"; declaration: WinDeclaration }>;

const matchReducer = (state: MatchPhaseState, action: MatchAction): MatchPhaseState => {
  switch (action.type) {
    case "player_updated":
      if (state.phase !== "setup") {
        return state;
      }
      return {
        phase: "setup",
        setup: MatchSetup.updatePlayer(state.setup, action.seat, action.patch),
      };
    case "rules_updated":
      if (state.phase !== "setup") {
        return state;
      }
      return { phase: "setup", setup: MatchSetup.updateRules(state.setup, action.patch) };
    case "match_started":
      if (state.phase !== "setup") {
        return state;
      }
      return { phase: "playing", match: MatchState.start(state.setup) };
    case "win_applied":
      if (state.phase !== "playing") {
        return state;
      }
      return { phase: "playing", match: MatchState.applyWin(state.match, action.declaration) };
  }
};

const createInitialState = (): MatchPhaseState => ({
  phase: "setup",
  setup: MatchSetup.createDefault(),
});

/** 対戦画面の状態と操作(headless) */
export function useMatch() {
  const [state, dispatch] = useReducer(matchReducer, undefined, createInitialState);
  return {
    state,
    updatePlayer: (seat: SeatIndex, patch: Partial<PlayerConfig>) =>
      dispatch({ type: "player_updated", seat, patch }),
    updateRules: (patch: Partial<RuleConfig>) => dispatch({ type: "rules_updated", patch }),
    startMatch: () => dispatch({ type: "match_started" }),
    applyWin: (declaration: WinDeclaration) => dispatch({ type: "win_applied", declaration }),
  };
}
