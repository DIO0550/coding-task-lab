"use client";

import { useMatch } from "../hooks/useMatch";
import { viewSeatOf } from "../utils/flow";
import { GameBoard } from "./GameBoard";
import { SetupForm } from "./SetupForm";
import {
  DrawResultOverlay,
  GameEndOverlay,
  WinResultOverlay,
} from "./ResultOverlays";

type MatchScreenProps = Readonly<{
  /** 牌山シャッフルのシード(テスト・再現用)。省略時はランダム */
  seed?: number;
  /** CPUの自動行動の遅延(ms)。テストでは0を指定 */
  cpuDelayMs?: number;
}>;

const INITIAL_SUMMARY = [
  { label: "局", value: "東一局" },
  { label: "本場", value: "0本場" },
  { label: "供託", value: "0本" },
  { label: "東家の持ち点", value: "25,000点" },
  { label: "南家の持ち点", value: "25,000点" },
  { label: "西家の持ち点", value: "25,000点" },
  { label: "北家の持ち点", value: "25,000点" },
] as const;

/** 対戦画面: 対戦開始設定 → 対局 → 結果表示 → 最終順位 */
export function MatchScreen({ seed, cpuDelayMs }: MatchScreenProps) {
  const match = useMatch({ seed, cpuDelayMs });

  if (match.state.stage === "setup") {
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 bg-emerald-900 p-6">
        <h1 className="text-2xl font-bold text-emerald-50">四人麻雀 対戦</h1>
        <section
          aria-label="開始時の卓状態"
          className="w-full max-w-xl rounded-lg bg-emerald-950/60 p-4 text-emerald-50"
        >
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {INITIAL_SUMMARY.map((item) => (
              <li key={item.label} className="flex justify-between gap-2">
                <span className="text-emerald-200">{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
        <SetupForm onStart={match.start} />
      </main>
    );
  }

  const game = match.state.game;
  const viewSeat = viewSeatOf(game);

  return (
    <main className="relative min-h-screen bg-emerald-900 p-4">
      <GameBoard
        game={game}
        viewSeat={viewSeat}
        riichiSelecting={match.state.riichiSelecting}
        onAction={match.act}
        onToggleRiichi={match.setRiichiSelecting}
      />
      {game.phase.type === "roundEnd" && game.phase.result.type === "win" && (
        <WinResultOverlay
          game={game}
          result={game.phase.result}
          onConfirm={() => match.act({ type: "confirmRoundEnd" })}
        />
      )}
      {game.phase.type === "roundEnd" && game.phase.result.type === "draw" && (
        <DrawResultOverlay
          game={game}
          result={game.phase.result}
          onConfirm={() => match.act({ type: "confirmRoundEnd" })}
        />
      )}
      {game.phase.type === "gameEnd" && (
        <GameEndOverlay
          game={game}
          result={game.phase.result}
          onRestart={match.reset}
        />
      )}
    </main>
  );
}
