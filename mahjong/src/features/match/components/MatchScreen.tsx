"use client";

import { useMatch } from "../hooks/useMatch";
import { MatchBoard } from "./MatchBoard";
import { SetupForm } from "./SetupForm";

/** 対戦画面(対戦開始設定 → 対戦中) */
export function MatchScreen() {
  const { state, updatePlayer, updateRules, startMatch, applyWin } = useMatch();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {state.phase === "setup" ? (
        <SetupForm
          setup={state.setup}
          onUpdatePlayer={updatePlayer}
          onUpdateRules={updateRules}
          onStart={startMatch}
        />
      ) : (
        <MatchBoard match={state.match} onWin={applyWin} />
      )}
    </main>
  );
}
