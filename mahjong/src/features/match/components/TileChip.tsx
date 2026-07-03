import type { Tile } from "@/src/domains/tile/index.ts";

import { formatTileLabel, isRedTile } from "../utils/tile-display.ts";

export type TileChipProps = Readonly<{
  tile: Tile;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}>;

/** 牌1枚を表示する汎用チップ。onClick があればボタンとして操作可能にする。 */
export const TileChip = ({ tile, onClick, selected = false, disabled = false }: TileChipProps) => {
  const label = formatTileLabel(tile);
  const red = isRedTile(tile);
  const clickable = onClick !== undefined && !disabled;

  const className = [
    "inline-flex h-12 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold leading-none",
    red ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100",
    selected
      ? "border-blue-500 bg-blue-100 ring-2 ring-blue-400 dark:bg-blue-950"
      : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
    clickable ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700" : "",
    disabled ? "opacity-40" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!clickable) {
    return (
      <span className={className} aria-label={label}>
        {label}
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-label={label}>
      {label}
    </button>
  );
};
