import React from "react";
import type { ActionOption } from "../../../types/game.ts";

type ActionBarProps = Readonly<{
  availableActions: readonly ActionOption[];
  selectedTile: string | null;
  onExecuteAction: (action: ActionOption) => void;
}>;

export const ActionBar: React.FC<ActionBarProps> = ({
  availableActions,
  selectedTile,
  onExecuteAction,
}) => {
  if (availableActions.length === 0) {
    return null;
  }

  const hasDiscard = availableActions.some((a) => a.type === "discard");
  const tsumoAction = availableActions.find((a) => a.type === "tsumo");
  const riichiAction = availableActions.find((a) => a.type === "riichi");
  const ronAction = availableActions.find((a) => a.type === "ron");
  const chiAction = availableActions.find((a) => a.type === "chi");
  const ponAction = availableActions.find((a) => a.type === "pon");
  const kanAction = availableActions.find((a) => a.type === "kan" || a.type === "ankan");
  const passAction = availableActions.find((a) => a.type === "pass");

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-500/40 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
      {/* Tsumo Win Button */}
      {tsumoAction && (
        <button
          type="button"
          onClick={() => onExecuteAction(tsumoAction)}
          className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-2.5 text-base font-black text-slate-950 shadow-lg shadow-amber-500/30 transition hover:scale-105"
        >
          🀄 ツモ和了
        </button>
      )}

      {/* Ron Win Button */}
      {ronAction && (
        <button
          type="button"
          onClick={() => onExecuteAction(ronAction)}
          className="rounded-lg bg-gradient-to-r from-rose-600 to-red-600 px-6 py-2.5 text-base font-black text-white shadow-lg shadow-rose-600/30 transition hover:scale-105"
        >
          ⚡ ロン和了
        </button>
      )}

      {/* Riichi Button */}
      {riichiAction && (
        <button
          type="button"
          onClick={() => {
            const discardTile = selectedTile || availableActions.find((a) => a.type === "discard")?.tile;
            if (discardTile) {
              onExecuteAction({ type: "riichi", tile: discardTile });
            }
          }}
          disabled={!selectedTile}
          className={`
            rounded-lg px-5 py-2 text-sm font-extrabold shadow-md transition
            ${
              selectedTile
                ? "bg-amber-600 text-white hover:bg-amber-500"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          🚩 リーチ宣言
        </button>
      )}

      {/* Chi / Pon / Kan */}
      {chiAction && (
        <button
          type="button"
          onClick={() => onExecuteAction(chiAction)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
        >
          チー
        </button>
      )}

      {ponAction && (
        <button
          type="button"
          onClick={() => onExecuteAction(ponAction)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500"
        >
          ポン
        </button>
      )}

      {kanAction && (
        <button
          type="button"
          onClick={() => onExecuteAction(kanAction)}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500"
        >
          カン
        </button>
      )}

      {/* Discard Selected Tile */}
      {hasDiscard && (
        <button
          type="button"
          onClick={() => {
            if (selectedTile) {
              const matched = availableActions.find((a) => a.type === "discard" && a.tile === selectedTile);
              if (matched) {
                onExecuteAction(matched);
              }
            }
          }}
          disabled={!selectedTile}
          className={`
            rounded-lg px-6 py-2.5 text-sm font-bold transition
            ${
              selectedTile
                ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-500 hover:scale-105"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          打牌する
        </button>
      )}

      {/* Pass Button */}
      {passAction && (
        <button
          type="button"
          onClick={() => onExecuteAction(passAction)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700"
        >
          スルー (パス)
        </button>
      )}
    </div>
  );
};
