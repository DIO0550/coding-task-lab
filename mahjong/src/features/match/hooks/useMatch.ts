import { useEffect, useReducer } from "react";
import { Game } from "../../../domains/game/index.ts";
import type {
  Action,
  GameState,
  RuleConfig,
  Seat,
} from "../../../domains/game/index.ts";
import { Cpu } from "../../../domains/cpu/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import { Random } from "../../../libs/random/index.ts";
import { Seed } from "../../../libs/seed/index.ts";
import { MatchSetup } from "../domains/match-setup.ts";
import type { SeatSetup } from "../domains/match-setup.ts";

/** CPU の自動進行の間隔(視認できるよう少し待つ。assumptions U-3) */
const CPU_DELAY_MS = 600;

type MatchState = Readonly<{
  setup: MatchSetup;
  /** null = 対戦未開始(設定・初期表示の状態) */
  game: GameState | null;
  /** リーチ宣言中(切る牌の選択待ち)か */
  riichiSelecting: boolean;
}>;

type MatchEvent =
  | Readonly<{ type: "seat_changed"; seat: Seat; patch: Partial<SeatSetup> }>
  | Readonly<{ type: "rule_changed"; patch: Partial<RuleConfig> }>
  | Readonly<{ type: "match_started"; seed: number }>
  | Readonly<{ type: "acted"; seat: Seat; action: Action }>
  | Readonly<{ type: "riichi_selection_changed"; selecting: boolean }>
  | Readonly<{ type: "result_confirmed" }>
  | Readonly<{ type: "match_reset" }>;

/**
 * 対戦状態の reducer。状態遷移は Game / MatchSetup の公開APIを呼ぶだけで、
 * ドメイン計算(進行判定・点数計算)は持たない純粋関数
 */
const matchReducer = (state: MatchState, event: MatchEvent): MatchState => {
  switch (event.type) {
    case "seat_changed":
      return {
        ...state,
        setup: MatchSetup.updateSeat(state.setup, event.seat, event.patch),
      };
    case "rule_changed":
      return {
        ...state,
        setup: MatchSetup.updateRule(state.setup, event.patch),
      };
    case "match_started":
      return {
        ...state,
        game: Game.start(
          state.setup.rule,
          MatchSetup.toPlayers(state.setup),
          Random.seeded(event.seed),
        ),
        riichiSelecting: false,
      };
    case "acted":
      return state.game === null
        ? state
        : {
            ...state,
            game: Game.apply(state.game, event.seat, event.action),
            riichiSelecting: false,
          };
    case "riichi_selection_changed":
      return { ...state, riichiSelecting: event.selecting };
    case "result_confirmed":
      return state.game === null
        ? state
        : { ...state, game: Game.confirmResult(state.game) };
    case "match_reset":
      return { ...state, game: null, riichiSelecting: false };
  }
};

const initMatchState = (initialGame: GameState | null): MatchState => ({
  setup: MatchSetup.createDefault(),
  game: initialGame,
  riichiSelecting: false,
});

export type UseMatchOptions = Readonly<{
  /** テスト・再現用: 対局途中の状態から開始する */
  initialGame?: GameState;
  /** テスト・再現用: 牌山シャッフルの seed を固定する */
  seed?: number;
}>;

/**
 * 対戦画面の headless フック。状態・派生値・ハンドラのみを公開し JSX は返さない。
 * CPU の手番はタイマー(外部システム)との同期として useEffect で自動進行する
 */
export const useMatch = (options?: UseMatchOptions) => {
  const [state, dispatch] = useReducer(
    matchReducer,
    options?.initialGame ?? null,
    initMatchState,
  );
  const { setup, game, riichiSelecting } = state;
  const fixedSeed = options?.seed;

  const currentActor = game === null ? null : Game.currentActor(game);
  const actingHuman =
    game !== null &&
    currentActor !== null &&
    game.players[currentActor].config.kind === "human"
      ? currentActor
      : null;
  const legalActions =
    game !== null && actingHuman !== null
      ? Game.legalActions(game, actingHuman)
      : [];
  const clickableTileKeys = new Set(
    legalActions
      .filter((action) =>
        riichiSelecting ? action.type === "riichi" : action.type === "discard",
      )
      .flatMap((action) => ("tile" in action ? [action.tile] : []))
      .map((tile) => Tile.toNotation(tile)),
  );

  // CPU の手番/宣言機会をタイマーで自動進行する(結果・終局・人間の番は何もしない)。
  // state 更新のたびに再評価され、クリーンアップで保留タイマーを破棄する
  useEffect(() => {
    if (game === null) {
      return;
    }
    const actor = Game.currentActor(game);
    if (actor === null) {
      return;
    }
    const config = game.players[actor].config;
    if (config.kind !== "cpu") {
      return;
    }
    const level = config.level ?? "standard";
    const timer = window.setTimeout(() => {
      const action = Cpu.decide(Game.viewFor(game, actor), level);
      dispatch({ type: "acted", seat: actor, action });
    }, CPU_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [game]);

  const changeSeat = (seat: Seat, patch: Partial<SeatSetup>) => {
    dispatch({ type: "seat_changed", seat, patch });
  };

  const changeRule = (patch: Partial<RuleConfig>) => {
    dispatch({ type: "rule_changed", patch });
  };

  const start = () => {
    dispatch({ type: "match_started", seed: fixedSeed ?? Seed.random() });
  };

  /** 手牌の牌クリック: リーチ宣言中はリーチ打牌、通常は打牌として適用する */
  const selectTile = (tile: Tile) => {
    if (actingHuman === null) {
      return;
    }
    const action: Action = riichiSelecting
      ? { type: "riichi", tile }
      : { type: "discard", tile };
    dispatch({ type: "acted", seat: actingHuman, action });
  };

  /** ツモ/ロン/チー/ポン/カン/パスなどのボタン操作を適用する */
  const act = (action: Action) => {
    if (actingHuman === null) {
      return;
    }
    dispatch({ type: "acted", seat: actingHuman, action });
  };

  const beginRiichi = () => {
    dispatch({ type: "riichi_selection_changed", selecting: true });
  };

  const cancelRiichi = () => {
    dispatch({ type: "riichi_selection_changed", selecting: false });
  };

  const confirmResult = () => {
    dispatch({ type: "result_confirmed" });
  };

  const resetMatch = () => {
    dispatch({ type: "match_reset" });
  };

  return {
    setup,
    game,
    currentActor,
    actingHuman,
    legalActions,
    riichiSelecting,
    clickableTileKeys,
    changeSeat,
    changeRule,
    start,
    selectTile,
    act,
    beginRiichi,
    cancelRiichi,
    confirmResult,
    resetMatch,
  };
};
