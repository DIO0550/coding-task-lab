import React from "react";
import type { RoundEndResult, PlayerState } from "../../../types/game.ts";

type ResultModalProps = Readonly<{
  result: RoundEndResult;
  players: readonly PlayerState[];
  onNextRound: () => void;
}>;

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  players,
  onNextRound,
}) => {
  const isWin = result.type === "win" && result.winners && result.winners.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <header className="border-b border-slate-800 pb-4 text-center">
          <h2 className="text-3xl font-black text-amber-400">
            {isWin ? "🎉 和了発生!" : "🌬️ 流局"}
          </h2>
        </header>

        <div className="my-6 space-y-4">
          {isWin ? (
            result.winners!.map((w, idx) => {
              const winnerPlayer = players[w.playerIndex];
              const loserPlayer = w.loserIndex !== undefined ? players[w.loserIndex] : null;

              return (
                <div key={idx} className="rounded-xl bg-slate-950/80 p-4 border border-amber-500/20">
                  <div className="flex items-center justify-between font-bold text-lg text-amber-300">
                    <span>
                      {winnerPlayer.name} ({w.winType === "tsumo" ? "ツモ" : "ロン"})
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      +{w.totalScore.toLocaleString()} 点
                    </span>
                  </div>

                  {loserPlayer && (
                    <div className="mt-1 text-xs text-rose-400">
                      放銃: {loserPlayer.name}
                    </div>
                  )}

                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <div className="text-xs font-bold text-slate-400 mb-2">成立役</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {w.yaku.map((y: { name: string; han: number }, yidx: number) => (
                        <div key={yidx} className="flex justify-between rounded bg-slate-900 px-2 py-1">
                          <span className="text-slate-200">{y.name}</span>
                          <span className="font-bold text-amber-400">{y.han} 翻</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-around text-xs font-bold text-slate-300 border-t border-slate-800 pt-2">
                    <span>計 {w.han} 翻</span>
                    <span>{w.fu} 符</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl bg-slate-950/80 p-4 text-center">
              <div className="text-lg font-bold text-slate-300">{result.reason ?? "荒牌流局"}</div>
              {result.tenpaiPlayerIndexes && (
                <div className="mt-2 text-xs text-emerald-400">
                  テンパイ:{" "}
                  {result.tenpaiPlayerIndexes.map((idx) => players[idx].name).join(", ") || "全員ノーテン"}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onNextRound}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3 text-lg font-extrabold text-white shadow-lg transition hover:scale-105"
          >
            次局へ進む
          </button>
        </div>
      </div>
    </div>
  );
};
