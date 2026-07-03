import type {
  GameAction,
  GameConfig,
  GameState,
  PlayerView,
  TurnActions,
} from "@/src/domains/game";
import type { Rng } from "@/src/types/random";
import { createGame, confirmRoundEnd } from "./round";
import { availableTurnActions } from "./turn-actions";
import { applyTurnAction } from "./turn";
import { applyClaimAction } from "./claims";
import { playerView } from "./view";

/**
 * ゲーム進行エンジン。すべて純粋関数で、乱数(洗牌)は Rng の注入で扱う。
 * apply は不正なアクションに対して状態をそのまま返す
 */
export const Game = {
  /** 対局を開始する(洗牌・配牌し、親の第1ツモまで進める) */
  create(config: GameConfig, rng: Rng): GameState {
    return createGame(config, rng);
  },

  /** 手番プレイヤーが選択できる行動。turn フェーズ以外は null */
  availableTurnActions(state: GameState): TurnActions | null {
    return availableTurnActions(state);
  },

  /** 状態遷移。不正なアクションは無視して state を返す */
  apply(state: GameState, action: GameAction, rng: Rng): GameState {
    switch (state.phase.type) {
      case "turn":
        return applyTurnAction(state, action);
      case "claims":
        return applyClaimAction(state, action);
      case "roundEnd":
        return action.type === "confirmRoundEnd"
          ? confirmRoundEnd(state, rng)
          : state;
      case "gameEnd":
        return state;
    }
  },

  /** 指定席から見える公開情報+自分の手牌のみのビュー */
  playerView(state: GameState, player: number): PlayerView {
    return playerView(state, player);
  },
} as const;
