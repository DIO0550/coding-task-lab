import type { Rng } from "../../libs/random/index.ts";
import type { Tile } from "../tile/index.ts";
import type {
  Action,
  GameState,
  PlayerConfig,
  PlayerView,
  RuleConfig,
  Seat,
  SeatWind,
} from "./types.ts";
import { windOfSeat } from "./types.ts";
import { legalActionsOf } from "./legal.ts";
import { applyAction } from "./apply.ts";
import { viewForSeat } from "./view.ts";
import { confirmRoundResult, rankingOf, startGame } from "./round.ts";

export const Game = {
  /**
   * 対局を開始する。洗牌・配牌・親=seat0(起家)・東1局0本場、
   * 親が第1ツモを持った phase="action" の状態を返す。
   * options.wallOrder に136枚の並びを渡すと固定牌山で開始できる(テスト用)
   */
  start(
    rule: RuleConfig,
    players: readonly PlayerConfig[],
    rng: Rng,
    options?: Readonly<{ wallOrder?: readonly Tile[] }>,
  ): GameState {
    return startGame(rule, players, rng, options);
  },

  /** その席が今取れる行動。手番/宣言機会でなければ空配列 */
  legalActions(state: GameState, seat: Seat): readonly Action[] {
    return legalActionsOf(state, seat);
  },

  /** seat から見た卓面(他家手牌・山の中身は含まない) */
  viewFor(state: GameState, seat: Seat): PlayerView {
    return viewForSeat(state, seat);
  },

  /** 行動を適用する。不正な行動は状態をそのまま返す(legalActions 由来を前提) */
  apply(state: GameState, seat: Seat, action: Action): GameState {
    return applyAction(state, seat, action);
  },

  /**
   * 今入力を待っている席。action=手番、response=未応答の先頭。
   * 結果表示・終局中は null(confirmResult 待ち)
   */
  currentActor(state: GameState): Seat | null {
    if (state.phase === "action") {
      return state.turn;
    }
    if (state.phase === "response") {
      return state.pendingResponders?.[0] ?? null;
    }
    return null;
  },

  /** 親位置から自風を求める(親=東) */
  windOf(state: GameState, seat: Seat): SeatWind {
    return windOfSeat(state.dealer, seat);
  },

  /** 終局したか */
  isFinished(state: GameState): boolean {
    return state.phase === "game_end";
  },

  /** 順位(素点降順、同点は起家=seat0 に近い席が上位) */
  ranking(
    state: GameState,
  ): readonly Readonly<{
    seat: Seat;
    name: string;
    points: number;
    rank: number;
  }>[] {
    return rankingOf(state);
  },

  /**
   * result_win / result_draw の点数を反映し、連荘・輪荘・終局を判定して
   * 次局を開始する(または game_end にする)
   */
  confirmResult(state: GameState): GameState {
    return confirmRoundResult(state);
  },
} as const;
