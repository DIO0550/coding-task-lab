import { useEffect, useMemo, useReducer } from "react";

import { GameState, type RankingEntry } from "@/src/domains/game-state";
import { PlayerAction } from "@/src/domains/player-action";
import { PlayerConfig } from "@/src/domains/player-config";
import { RuleConfig } from "@/src/domains/rule-config";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import type { TableView } from "@/src/domains/table-view";
import { Random } from "@/src/libs/random";
import { Scheduler } from "@/src/libs/scheduler";
import { GameEngine } from "@/src/services/game-engine";

import type { MatchOptions } from "../../types/match-options";

/**
 * 対戦画面の状態と操作をまとめる headless フック。
 * ゲーム進行・CPU 判断はすべて GameEngine に委譲し、ここでは状態の保持と UI イベントの仲介だけを行う。
 */
export type MatchStage = "setup" | "playing" | "finished";

type MatchState = Readonly<{
  players: readonly PlayerConfig[];
  rules: RuleConfig;
  game: GameState | null;
  riichiMode: boolean;
}>;

type MatchEvent =
  | Readonly<{ type: "player_changed"; seat: SeatIndex; patch: Partial<PlayerConfig> }>
  | Readonly<{ type: "rules_changed"; patch: Partial<RuleConfig> }>
  | Readonly<{ type: "game_started"; game: GameState }>
  | Readonly<{ type: "game_updated"; game: GameState }>
  | Readonly<{ type: "riichi_mode_toggled" }>
  | Readonly<{ type: "match_reset" }>;

const DEFAULT_STEP_DELAY_MS = 400;

const initialState = (): MatchState => ({
  players: PlayerConfig.defaults(),
  rules: RuleConfig.default(),
  game: null,
  riichiMode: false,
});

const matchReducer = (state: MatchState, event: MatchEvent): MatchState => {
  switch (event.type) {
    case "player_changed":
      return {
        ...state,
        players: state.players.map((player, seat) => (seat === event.seat ? { ...player, ...event.patch } : player)),
      };
    case "rules_changed":
      return { ...state, rules: RuleConfig.with(state.rules, event.patch) };
    case "game_started":
    case "game_updated":
      return { ...state, game: event.game, riichiMode: false };
    case "riichi_mode_toggled":
      return { ...state, riichiMode: !state.riichiMode };
    case "match_reset":
      return { ...state, game: null, riichiMode: false };
  }
};

const stageOf = (game: GameState | null): MatchStage => {
  if (game === null) return "setup";
  return GameState.isFinished(game) ? "finished" : "playing";
};

/** 表示する席: 判断を求められている人間 → 最初の人間 → 席0(全員 CPU の観戦) */
const resolveViewerSeat = (game: GameState | null, players: readonly PlayerConfig[]): SeatIndex => {
  const pendingHuman = game === null ? undefined : GameEngine.pendingSeats(game).find((seat) => GameState.isHuman(game, seat));
  const firstHuman = Seat.all().find((seat) => PlayerConfig.isHuman(players[seat]));
  return pendingHuman ?? firstHuman ?? 0;
};

export type UseMatchResult = Readonly<{
  stage: MatchStage;
  players: readonly PlayerConfig[];
  rules: RuleConfig;
  game: GameState | null;
  view: TableView | null;
  viewerSeat: SeatIndex;
  /** 表示席がいま選べる行動(判断待ちでなければ空) */
  actions: readonly PlayerAction[];
  riichiMode: boolean;
  ranking: readonly RankingEntry[];
  updatePlayer: (seat: SeatIndex, patch: Partial<PlayerConfig>) => void;
  updateRules: (patch: Partial<RuleConfig>) => void;
  start: () => void;
  act: (action: PlayerAction) => void;
  toggleRiichiMode: () => void;
  confirmResult: () => void;
  newMatch: () => void;
}>;

export const useMatch = (options: MatchOptions = {}): UseMatchResult => {
  const [state, dispatch] = useReducer(matchReducer, undefined, initialState);
  const { rng: providedRng, wallTiles, initial, stepDelayMs } = options;
  const rng = useMemo(() => providedRng ?? Random.create(), [providedRng]);
  const delay = stepDelayMs ?? DEFAULT_STEP_DELAY_MS;
  const { game, players, rules, riichiMode } = state;

  // CPU の手番はブラウザのタイマーと同期して自動で進める(外部システムとの同期)
  useEffect(() => {
    if (game === null || !GameEngine.hasPendingCpu(game)) return;
    return Scheduler.schedule(() => dispatch({ type: "game_updated", game: GameEngine.advanceCpu(game, rng) }), delay);
  }, [game, rng, delay]);

  const viewerSeat = resolveViewerSeat(game, players);
  const view = useMemo(() => (game === null ? null : GameEngine.viewFor(game, viewerSeat)), [game, viewerSeat]);
  const actions = useMemo(() => (game === null ? [] : GameEngine.availableActions(game, viewerSeat)), [game, viewerSeat]);
  const ranking = useMemo(() => (game === null ? [] : GameEngine.ranking(game)), [game]);

  return {
    stage: stageOf(game),
    players,
    rules,
    game,
    view,
    viewerSeat,
    actions,
    riichiMode,
    ranking,
    updatePlayer: (seat, patch) => dispatch({ type: "player_changed", seat, patch }),
    updateRules: (patch) => dispatch({ type: "rules_changed", patch }),
    start: () => dispatch({ type: "game_started", game: GameEngine.start({ players, rules, wallTiles, initial }, rng) }),
    act: (action) => {
      if (game === null) return;
      dispatch({ type: "game_updated", game: GameEngine.apply(game, viewerSeat, action, rng) });
    },
    toggleRiichiMode: () => dispatch({ type: "riichi_mode_toggled" }),
    confirmResult: () => {
      if (game === null) return;
      dispatch({ type: "game_updated", game: GameEngine.apply(game, viewerSeat, PlayerAction.confirmResult(), rng) });
    },
    newMatch: () => dispatch({ type: "match_reset" }),
  };
};
