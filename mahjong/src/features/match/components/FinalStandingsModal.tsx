import React from "react";
import type { FinalRanking } from "../../../types/game.ts";

type FinalStandingsModalProps = Readonly<{
  rankings: readonly FinalRanking[];
  onReset: () => void;
}>;

export const FinalStandingsModal: React.FC<FinalStandingsModalProps> = ({
  rankings,
  onReset,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/50 bg-slate-900 p-8 shadow-2xl text-slate-100">
        <header className="border-b border-amber-500/30 pb-4 text-center">
          <h2 className="text-4xl font-black tracking-wide text-amber-400 drop-shadow">
            🏆 対局終了 - 最終順位
          </h2>
        </header>

        <div className="my-6 space-y-3">
          {rankings.map((r) => {
            const rankBadges: Record<number, string> = {
              1: "🥇 1位",
              2: "🥈 2位",
              3: "🥉 3位",
              4: "4位",
            };

            return (
              <div
                key={r.playerIndex}
                className={`
                  flex items-center justify-between rounded-xl p-4 border font-bold
                  ${
                    r.rank === 1
                      ? "border-amber-400 bg-amber-500/10 text-amber-300 shadow-lg shadow-amber-950/30"
                      : "border-slate-800 bg-slate-950/80 text-slate-200"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{rankBadges[r.rank]}</span>
                  <span className="text-base">{r.name}</span>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-xl font-extrabold">
                    {r.score.toLocaleString()} 点
                  </span>
                  <span
                    className={`text-sm ${
                      r.point >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    ({r.point >= 0 ? `+${r.point}` : r.point} pt)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-3.5 text-lg font-extrabold text-white shadow-lg transition hover:scale-105"
          >
            対戦設定へ戻る
          </button>
        </div>
      </div>
    </div>
  );
};
