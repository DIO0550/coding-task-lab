import React from "react";
import { TileView } from "./TileView.tsx";
import type { TableState } from "../../../types/game.ts";

type TableBoardProps = Readonly<{
  table: TableState;
}>;

const WIND_TEXT: Record<string, string> = {
  ton: "東",
  nan: "南",
};

export const TableBoard: React.FC<TableBoardProps> = ({ table }) => {
  const roundText = `${WIND_TEXT[table.roundWind] ?? "東"}${table.roundNumber}局`;

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-emerald-700/50 bg-gradient-to-br from-emerald-900/90 to-emerald-950/90 p-6 shadow-2xl backdrop-blur">
      {/* Board Round Info */}
      <div className="flex items-center gap-4 text-center">
        <span className="text-2xl font-black tracking-widest text-amber-300 drop-shadow">
          {roundText}
        </span>
        <div className="flex gap-2 text-xs font-bold">
          <span className="rounded bg-amber-900/60 px-2.5 py-1 text-amber-200 border border-amber-700/40">
            {table.honba} 本場
          </span>
          <span className="rounded bg-emerald-900/60 px-2.5 py-1 text-emerald-200 border border-emerald-700/40">
            供託 {table.kyoutaku} 本
          </span>
        </div>
      </div>

      {/* Dora & Wall Count */}
      <div className="mt-4 flex items-center justify-around gap-6 border-t border-emerald-800/50 pt-3 text-xs text-emerald-100">
        {/* Dora Indicators */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-300">ドラ表示牌:</span>
          <div className="flex gap-1">
            {table.doraIndicators.map((tileStr, idx) => (
              <TileView key={idx} tileString={tileStr} size="sm" />
            ))}
          </div>
        </div>

        {/* Wall Count */}
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <span>山枚数:</span>
          <span className="rounded bg-slate-900 px-2 py-0.5 text-base font-extrabold text-amber-400">
            {table.wall.length}
          </span>
        </div>
      </div>
    </div>
  );
};
