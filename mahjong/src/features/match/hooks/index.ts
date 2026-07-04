"use client";

import { useReducer } from "react";

import { GameEngine, defaultRules, type CpuLevel, type GameState, type MatchLength, type PlayerConfig, type PlayerKind, type RuleConfig } from "@/src/services/game";
import type { Tile } from "@/src/domains/mahjong";

type MatchSettings = Readonly<{
  players: readonly PlayerConfig[];
  rules: RuleConfig;
}>;

type MatchControllerState = Readonly<{
  settings: MatchSettings;
  game?: GameState;
}>;

type MatchAction =
  | Readonly<{ type: "set_player_kind"; index: number; kind: PlayerKind }>
  | Readonly<{ type: "set_player_name"; index: number; name: string }>
  | Readonly<{ type: "set_cpu_level"; index: number; level: CpuLevel }>
  | Readonly<{ type: "set_match_length"; length: MatchLength }>
  | Readonly<{ type: "set_starting_points"; points: 25000 | 30000 }>
  | Readonly<{ type: "toggle_rule"; key: "kuitan" | "atozuke" | "redDora" | "cpuAutoWin" }>
  | Readonly<{ type: "set_return_points"; returnPoints: 30000 | "none" }>
  | Readonly<{ type: "start" }>
  | Readonly<{ type: "discard"; tile: Tile }>
  | Readonly<{ type: "riichi"; tile: Tile }>
  | Readonly<{ type: "kan"; tile: Tile }>
  | Readonly<{ type: "tsumo" }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "pon" }>
  | Readonly<{ type: "chi" }>
  | Readonly<{ type: "pass" }>
  | Readonly<{ type: "confirm_result" }>;

const initialPlayers: readonly PlayerConfig[] = [
  { kind: "human", name: "あなた", cpuLevel: "standard" },
  { kind: "cpu", name: "CPU 南", cpuLevel: "beginner" },
  { kind: "cpu", name: "CPU 西", cpuLevel: "standard" },
  { kind: "cpu", name: "CPU 北", cpuLevel: "advanced" },
];

const initialState: MatchControllerState = {
  settings: {
    players: initialPlayers,
    rules: defaultRules,
  },
};

export const useMatchController = () => {
  const [state, dispatch] = useReducer(matchReducer, initialState);
  const currentPlayer = state.game?.players[state.game.currentPlayerId];
  const availableActions =
    state.game === undefined || currentPlayer === undefined
      ? GameEngine.availableActions(emptyGame(), 0)
      : GameEngine.availableActions(state.game, currentPlayer.id);
  const kanTile =
    state.game === undefined || currentPlayer === undefined
      ? undefined
      : findKanTile(
          state.game.drawnTile === undefined || state.game.currentPlayerId !== currentPlayer.id
            ? currentPlayer.hand
            : [...currentPlayer.hand, state.game.drawnTile],
          currentPlayer.melds,
        );

  return {
    state,
    currentPlayer,
    availableActions,
    kanTile,
    setPlayerKind: (index: number, kind: PlayerKind) => dispatch({ type: "set_player_kind", index, kind }),
    setPlayerName: (index: number, name: string) => dispatch({ type: "set_player_name", index, name }),
    setCpuLevel: (index: number, level: CpuLevel) => dispatch({ type: "set_cpu_level", index, level }),
    setMatchLength: (length: MatchLength) => dispatch({ type: "set_match_length", length }),
    setStartingPoints: (points: 25000 | 30000) => dispatch({ type: "set_starting_points", points }),
    setReturnPoints: (returnPoints: 30000 | "none") => dispatch({ type: "set_return_points", returnPoints }),
    toggleRule: (key: "kuitan" | "atozuke" | "redDora" | "cpuAutoWin") => dispatch({ type: "toggle_rule", key }),
    start: () => dispatch({ type: "start" }),
    discard: (tile: Tile) => dispatch({ type: "discard", tile }),
    riichi: (tile: Tile) => dispatch({ type: "riichi", tile }),
    kan: (tile: Tile) => dispatch({ type: "kan", tile }),
    tsumo: () => dispatch({ type: "tsumo" }),
    ron: () => dispatch({ type: "ron" }),
    pon: () => dispatch({ type: "pon" }),
    chi: () => dispatch({ type: "chi" }),
    pass: () => dispatch({ type: "pass" }),
    confirmResult: () => dispatch({ type: "confirm_result" }),
  };
};

const matchReducer = (state: MatchControllerState, action: MatchAction): MatchControllerState => {
  if (action.type === "set_player_kind") {
    return {
      ...state,
      settings: {
        ...state.settings,
        players: state.settings.players.map((player, index) => (index === action.index ? { ...player, kind: action.kind } : player)),
      },
    };
  }
  if (action.type === "set_player_name") {
    return {
      ...state,
      settings: {
        ...state.settings,
        players: state.settings.players.map((player, index) => (index === action.index ? { ...player, name: action.name } : player)),
      },
    };
  }
  if (action.type === "set_cpu_level") {
    return {
      ...state,
      settings: {
        ...state.settings,
        players: state.settings.players.map((player, index) => (index === action.index ? { ...player, cpuLevel: action.level } : player)),
      },
    };
  }
  if (action.type === "set_match_length") {
    return { ...state, settings: { ...state.settings, rules: { ...state.settings.rules, length: action.length } } };
  }
  if (action.type === "set_starting_points") {
    return { ...state, settings: { ...state.settings, rules: { ...state.settings.rules, startingPoints: action.points } } };
  }
  if (action.type === "set_return_points") {
    return { ...state, settings: { ...state.settings, rules: { ...state.settings.rules, returnPoints: action.returnPoints } } };
  }
  if (action.type === "toggle_rule") {
    return {
      ...state,
      settings: {
        ...state.settings,
        rules: { ...state.settings.rules, [action.key]: !state.settings.rules[action.key] },
      },
    };
  }
  if (action.type === "start") {
    const game = GameEngine.advanceToHumanOrResult(
      GameEngine.start({ players: state.settings.players, rules: state.settings.rules, seed: 7 }),
    );
    return { ...state, game };
  }
  if (action.type === "discard" && state.game !== undefined) {
    return { ...state, game: GameEngine.applyHumanAction(state.game, { type: "discard", tile: action.tile }) };
  }
  if (action.type === "riichi" && state.game !== undefined) {
    return { ...state, game: GameEngine.applyHumanAction(state.game, { type: "riichi", tile: action.tile }) };
  }
  if (action.type === "kan" && state.game !== undefined) {
    return { ...state, game: GameEngine.applyHumanAction(state.game, { type: "kan", tile: action.tile }) };
  }
  if (action.type === "tsumo" && state.game !== undefined) {
    return { ...state, game: GameEngine.applyHumanAction(state.game, { type: "tsumo" }) };
  }
  if ((action.type === "ron" || action.type === "pon" || action.type === "chi" || action.type === "pass") && state.game !== undefined) {
    return { ...state, game: GameEngine.applyHumanAction(state.game, action) };
  }
  if (action.type === "confirm_result" && state.game !== undefined) {
    return { ...state, game: GameEngine.advanceToHumanOrResult(GameEngine.confirmResult(state.game)) };
  }
  return state;
};

const emptyGame = (): GameState => GameEngine.start({ seed: 1 });

const findKanTile = (hand: readonly Tile[], melds: GameState["players"][number]["melds"]): Tile | undefined =>
  hand.find((tile) => hand.filter((candidate) => normalizeForUi(candidate) === normalizeForUi(tile)).length >= 4) ??
  hand.find((tile) =>
    melds.some((meld) => meld.type === "pon" && normalizeForUi(meld.tiles[0] ?? "1m") === normalizeForUi(tile)),
  );

const normalizeForUi = (tile: Tile): string => (tile.startsWith("0") ? `5${tile[1]}` : tile);
