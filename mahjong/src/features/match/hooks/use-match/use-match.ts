"use client";

import { useCallback, useMemo, useReducer } from "react";

import { Participant } from "../../../../domains/participant/index.ts";
import { Rule } from "../../../../domains/rule/index.ts";
import { useTimeout } from "../../../../hooks/use-timeout/index.ts";
import { Random } from "../../../../libs/random/index.ts";
import { Game, GameAction, PlayerView } from "../../../../services/game/index.ts";
import type { GameSession } from "../../../../services/game/index.ts";
import type { Rng } from "../../../../types/rng.ts";

/** 画面の状態。 */
export type MatchPhase = "setup" | "playing" | "round_end" | "match_end";

type MatchState = Readonly<{
  participants: readonly Participant[];
  rule: Rule;
  session: GameSession | null;
  /** リーチ宣言牌の選択中か。 */
  riichiMode: boolean;
}>;

type MatchEvent =
  | Readonly<{ type: "change_participant"; seat: number; participant: Participant }>
  | Readonly<{ type: "change_rule"; rule: Rule }>
  | Readonly<{ type: "start"; rng: Rng }>
  | Readonly<{ type: "act"; seat: number; action: GameAction }>
  | Readonly<{ type: "select_tile"; seat: number; index: number }>
  | Readonly<{ type: "confirm" }>
  | Readonly<{ type: "advance"; session: GameSession }>
  | Readonly<{ type: "restart" }>;

const initialState = (): MatchState => ({
  participants: Participant.defaultSeats(),
  rule: Rule.default(),
  session: null,
  riichiMode: false,
});

const applyAction = (
  state: MatchState,
  seat: number,
  action: GameAction,
): MatchState => {
  if (state.session === null) {
    return state;
  }
  // リーチは宣言後に切る牌を選ぶため、この時点では牌選択モードへ移るだけ。
  if (action.type === "riichi") {
    return { ...state, riichiMode: true };
  }
  return {
    ...state,
    session: Game.apply(state.session, seat, action),
    riichiMode: false,
  };
};

const selectTile = (
  state: MatchState,
  seat: number,
  index: number,
): MatchState => {
  if (state.session === null) {
    return state;
  }
  const action = state.riichiMode
    ? GameAction.riichi(index)
    : GameAction.discard(index);
  return {
    ...state,
    session: Game.apply(state.session, seat, action),
    riichiMode: false,
  };
};

const reducer = (state: MatchState, event: MatchEvent): MatchState => {
  switch (event.type) {
    case "change_participant":
      return {
        ...state,
        participants: state.participants.map((participant, seat) =>
          seat === event.seat ? event.participant : participant,
        ),
      };
    case "change_rule":
      return { ...state, rule: event.rule };
    case "start":
      return {
        ...state,
        session: Game.start(state.rule, state.participants, event.rng),
        riichiMode: false,
      };
    case "act":
      return applyAction(state, event.seat, event.action);
    case "select_tile":
      return selectTile(state, event.seat, event.index);
    case "confirm":
      return state.session === null
        ? state
        : { ...state, session: Game.confirmResult(state.session), riichiMode: false };
    case "advance":
      return { ...state, session: event.session, riichiMode: false };
    case "restart":
      return { ...initialState(), participants: state.participants, rule: state.rule };
    default:
      return state;
  }
};

const phaseOf = (session: GameSession | null): MatchPhase => {
  if (session === null) {
    return "setup";
  }
  if (session.status === "match_end") {
    return "match_end";
  }
  return session.status === "round_end" ? "round_end" : "playing";
};

const humanSeatOf = (participants: readonly Participant[]): number => {
  const seat = participants.findIndex(
    (participant) => participant.kind === "human",
  );
  return seat < 0 ? 0 : seat;
};

/** 対戦画面の状態と操作。 */
export type UseMatchResult = Readonly<{
  phase: MatchPhase;
  participants: readonly Participant[];
  rule: Rule;
  session: GameSession | null;
  /** 操作するプレイヤーの席。 */
  humanSeat: number;
  /** 操作するプレイヤーから見た卓の状態。開始前は null。 */
  view: PlayerView | null;
  /** リーチ宣言牌の選択中か。 */
  riichiMode: boolean;
  /** いま選べる純手牌の位置。 */
  selectableIndexes: readonly number[];
  changeParticipant: (seat: number, participant: Participant) => void;
  changeRule: (rule: Rule) => void;
  start: () => void;
  act: (action: GameAction) => void;
  selectTile: (index: number) => void;
  confirm: () => void;
  restart: () => void;
}>;

export type UseMatchOptions = Readonly<{
  /** CPUの自動進行の間隔(ミリ秒)。 */
  autoAdvanceMs?: number;
  /** 牌山生成に使う乱数。省略時は実行環境の乱数。 */
  rng?: Rng;
}>;

const DEFAULT_AUTO_ADVANCE_MS = 550;

/**
 * 対戦の状態を保持し、CPUの手番を自動で進める。
 * ドメインロジックは services/game に委ね、ここでは状態の保持と仲介のみを行う。
 */
export const useMatch = (options: UseMatchOptions = {}): UseMatchResult => {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const autoAdvanceMs = options.autoAdvanceMs ?? DEFAULT_AUTO_ADVANCE_MS;
  const humanSeat = humanSeatOf(state.participants);

  const view = useMemo(
    () =>
      state.session === null ? null : Game.viewFor(state.session, humanSeat),
    [state.session, humanSeat],
  );

  const pending = useMemo(
    () =>
      state.session === null || state.session.status !== "playing"
        ? null
        : Game.autoStep(state.session),
    [state.session],
  );

  const advance = useCallback(
    () => (pending === null ? undefined : dispatch({ type: "advance", session: pending })),
    [pending],
  );

  useTimeout(pending === null ? null : advance, autoAdvanceMs);

  const selectableIndexes =
    view === null
      ? []
      : state.riichiMode
        ? PlayerView.riichiIndexes(view)
        : PlayerView.discardableIndexes(view);

  return {
    phase: phaseOf(state.session),
    participants: state.participants,
    rule: state.rule,
    session: state.session,
    humanSeat,
    view,
    riichiMode: state.riichiMode,
    selectableIndexes,
    changeParticipant: (seat, participant) =>
      dispatch({ type: "change_participant", seat, participant }),
    changeRule: (rule) => dispatch({ type: "change_rule", rule }),
    start: () =>
      dispatch({ type: "start", rng: options.rng ?? Random.system() }),
    act: (action) => dispatch({ type: "act", seat: humanSeat, action }),
    selectTile: (index) =>
      dispatch({ type: "select_tile", seat: humanSeat, index }),
    confirm: () => dispatch({ type: "confirm" }),
    restart: () => dispatch({ type: "restart" }),
  };
};
