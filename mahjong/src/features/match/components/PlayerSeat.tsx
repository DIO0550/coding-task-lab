import React from "react";
import { TileView } from "./TileView.tsx";
import type { PlayerState } from "../../../types/game.ts";

type PlayerSeatProps = Readonly<{
  player: PlayerState;
  isCurrentTurn: boolean;
  isDealer: boolean;
}>;

const WIND_TEXT: Record<string, string> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
};

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  isDealer,
}) => {
  return (
    <div
      className={`
        flex flex-col gap-2 rounded-xl border p-3 shadow-lg transition-all duration-200
        ${
          isCurrentTurn
            ? "border-amber-400/80 bg-slate-900/90 ring-2 ring-amber-400/50 shadow-amber-950/40"
            : "border-slate-800 bg-slate-950/80"
        }
      `}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {WIND_TEXT[player.seatWind]}
          </span>
          <span className="text-slate-100 max-w-[100px] truncate">{player.name}</span>
          {isDealer && (
            <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
              親
            </span>
          )}
          {player.riichiState !== "none" && (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
              立直
            </span>
          )}
        </div>

        {/* Score */}
        <div className="text-right">
          <span className="text-base font-extrabold text-amber-300">
            {player.score.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 ml-0.5">点</span>
        </div>
      </div>

      {/* Discards (河) */}
      <div className="flex flex-col gap-1 rounded bg-slate-950/60 p-1.5 border border-slate-900">
        <div className="text-[10px] font-semibold text-slate-400">捨て牌</div>
        <div className="grid grid-cols-6 gap-1 min-h-[44px]">
          {player.discards.map((tileStr, idx) => (
            <TileView key={idx} tileString={tileStr} size="sm" />
          ))}
        </div>
      </div>

      {/* Melds (副露) */}
      {player.melds.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {player.melds.map((m, idx) => (
            <div key={idx} className="flex gap-0.5 rounded bg-slate-900 p-1 border border-slate-800">
              {m.tiles.map((t, tidx) => (
                <TileView key={tidx} tileString={t} size="sm" />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
