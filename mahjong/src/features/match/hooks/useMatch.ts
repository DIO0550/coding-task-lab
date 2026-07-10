import { useCallback, useEffect, useReducer, useState } from "react";

import { createRandomRng } from "@/src/libs/random.ts";
import type { Scheduler } from "@/src/libs/scheduler.ts";
import { createScheduler } from "@/src/libs/scheduler.ts";
import type { GameAction, MatchConfig, MatchState } from "@/src/domains/game/index.ts";
import { CpuAi } from "@/src/services/cpu-ai/index.ts";
import { GameEngine } from "@/src/services/game-engine/index.ts";
import type { Rng } from "@/src/types/rng.ts";

import { cpuThinkDelay } from "../utils/cpu-delay.ts";
import { findPendingCpuActor } from "../utils/pending-actor.ts";

type MatchReducerState = Readonly<{ match: MatchState }>;

type MatchReducerAction = Readonly<{ type: "apply"; action: GameAction }>;

/** reducer はアクションの解釈に徹し、実際の状態遷移計算はすべて GameEngine.apply(services) に委譲する。 */
const matchReducer = (state: MatchReducerState, action: MatchReducerAction): MatchReducerState => ({
  match: GameEngine.apply(state.match, action.action),
});

export type UseMatchOptions = Readonly<{
  /** テスト用に固定 seed の Rng を注入する。省略時は本物の Math.random ベース。 */
  rng?: Rng;
  /** テスト用に即時実行/手動 flush 可能なフェイクを注入する。省略時は本物の setTimeout ベース。 */
  scheduler?: Scheduler;
  /** 指定した場合、config からの createMatch を行わずこの状態から始める(和了・流局シナリオのテスト用)。 */
  initialMatch?: MatchState;
}>;

/**
 * 対戦画面の headless フック。MatchState の保持・GameAction の送信・CPU の自動進行を担う。
 * 状態は useReducer に一本化し(1操作が複数値を更新するため)、CPU の手番進行は
 * useEffect + libs/scheduler(外部システム = タイマーとの同期)で行う。
 */
export const useMatch = (config: MatchConfig, options: UseMatchOptions = {}) => {
  // rng/scheduler は一度だけ確定させたい安定値であり、useEffect の依存配列やレンダー中の
  // 初期化計算で読むため useState の遅延初期化で保持する(読むのが render 中なので useRef ではなく useState)。
  const [rng] = useState<Rng>(() => options.rng ?? createRandomRng());
  const [scheduler] = useState<Scheduler>(() => options.scheduler ?? createScheduler());

  const [state, dispatch] = useReducer(
    matchReducer,
    undefined,
    (): MatchReducerState => ({
      match: options.initialMatch ?? GameEngine.createMatch(config, rng),
    }),
  );

  const sendAction = useCallback((action: GameAction) => {
    dispatch({ type: "apply", action });
  }, []);

  // CPU の手番進行: 「state が変わる → 次の CPU 行動を1回だけスケジュールする」という単純な形に保つ。
  // 人間の手番/応答待ちのときは findPendingCpuActor が null を返すため何もしない。
  useEffect(() => {
    const pending = findPendingCpuActor(state.match);
    if (pending === null) {
      return undefined;
    }
    const delay = cpuThinkDelay(rng);
    return scheduler.schedule(() => {
      const view = GameEngine.viewFor(state.match, pending.seat);
      const action = CpuAi.decide(view, pending.level, rng);
      dispatch({ type: "apply", action });
    }, delay);
  }, [state.match, scheduler, rng]);

  return { match: state.match, sendAction };
};
