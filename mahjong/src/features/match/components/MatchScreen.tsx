"use client";

import { useState } from "react";

import type { MatchState } from "@/src/domains/game/index.ts";
import type { Scheduler } from "@/src/libs/scheduler.ts";
import type { Rng } from "@/src/types/rng.ts";

import { useMatchSetup } from "../hooks/useMatchSetup.ts";
import { MatchView } from "./MatchView.tsx";
import { SetupScreen } from "./SetupScreen.tsx";

export type MatchScreenProps = Readonly<{
  /** テスト用に固定 seed の Rng を注入する。省略時は本物の Math.random ベース。 */
  rng?: Rng;
  /** テスト用に即時実行/手動 flush 可能なフェイクを注入する。省略時は本物の setTimeout ベース。 */
  scheduler?: Scheduler;
  /** 指定した場合、設定画面を飛ばしてこの状態から対局を開始する(テスト用)。 */
  initialMatch?: MatchState;
}>;

/**
 * 対戦画面 feature の公開エントリポイント。
 * 対戦開始設定画面と対局画面の切り替えのみを行い、ドメインロジックは持たない。
 */
export const MatchScreen = ({ rng, scheduler, initialMatch }: MatchScreenProps = {}) => {
  const setup = useMatchSetup();
  const [started, setStarted] = useState(initialMatch !== undefined);

  if (!started) {
    return <SetupScreen setup={setup} onStart={() => setStarted(true)} />;
  }

  return (
    <MatchView
      config={setup.config}
      rng={rng}
      scheduler={scheduler}
      initialMatch={initialMatch}
      onBackToSetup={() => setStarted(false)}
    />
  );
};
