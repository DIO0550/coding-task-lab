import React from "react";
import { Tile } from "../../../domains/tile/index.ts";

type TileViewProps = Readonly<{
  tileString: string;
  isSelected?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}>;

const HONOR_TEXT: Record<number, string> = {
  1: "東",
  2: "南",
  3: "西",
  4: "北",
  5: "白",
  6: "發",
  7: "中",
};

export const TileView: React.FC<TileViewProps> = ({
  tileString,
  isSelected = false,
  isClickable = false,
  onClick,
  size = "md",
}) => {
  let tile: Tile;
  try {
    tile = Tile.parse(tileString);
  } catch {
    return <div className="w-8 h-12 bg-gray-300 rounded border border-gray-400" />;
  }

  const sizeClasses = {
    sm: "w-7 h-10 text-xs",
    md: "w-9 h-13 text-sm",
    lg: "w-11 h-16 text-base font-bold",
  }[size];

  const renderContent = () => {
    if (tile.suit === "z") {
      const text = HONOR_TEXT[tile.value] ?? "";
      let colorClass = "text-gray-900 dark:text-gray-100";
      if (tile.value === 6) colorClass = "text-emerald-600 dark:text-emerald-400 font-extrabold"; // 發
      if (tile.value === 7) colorClass = "text-red-600 dark:text-red-500 font-extrabold"; // 中
      return <span className={colorClass}>{text}</span>;
    }

    const suitSymbol = { m: "萬", p: "筒", s: "索" }[tile.suit];
    const isRedDora = tile.isRed;

    let textClass = "text-indigo-900 dark:text-indigo-200";
    if (tile.suit === "m") textClass = "text-amber-700 dark:text-amber-400";
    if (tile.suit === "p") textClass = "text-blue-700 dark:text-blue-400";
    if (tile.suit === "s") textClass = "text-emerald-700 dark:text-emerald-400";
    if (isRedDora) textClass = "text-rose-600 font-extrabold animate-pulse";

    return (
      <div className="flex flex-col items-center justify-center leading-none">
        <span className={textClass}>{isRedDora ? "5" : tile.value}</span>
        <span className="text-[10px] opacity-80">{suitSymbol}</span>
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        relative inline-flex items-center justify-center rounded-md border
        shadow-md transition-all duration-150 select-none
        ${sizeClasses}
        ${
          isSelected
            ? "-translate-y-2 border-amber-400 ring-2 ring-amber-400 shadow-amber-500/50 bg-amber-50 dark:bg-amber-950"
            : "border-amber-200/50 bg-gradient-to-b from-amber-50 to-amber-100 dark:from-slate-800 dark:to-slate-900 hover:border-amber-400"
        }
        ${isClickable ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : "cursor-default"}
      `}
    >
      {renderContent()}
    </button>
  );
};
