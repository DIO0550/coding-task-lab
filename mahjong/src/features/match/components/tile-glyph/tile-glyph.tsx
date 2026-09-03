import { Tile } from "@/src/domains/tile";

import { Labels } from "../../utils/labels";

/**
 * 牌1枚の表示。数牌は数字と色(萬/筒/索)、字牌は文字を描く。赤5は赤色で示す。
 */
export type TileGlyphSize = "sm" | "md" | "lg";
export type TileGlyphVariant = "default" | "dimmed" | "riichi";

type Props = Readonly<{
  tile: Tile;
  size?: TileGlyphSize;
  variant?: TileGlyphVariant;
}>;

const SIZE_CLASS: Readonly<Record<TileGlyphSize, string>> = {
  sm: "h-8 w-6 text-[11px]",
  md: "h-11 w-8 text-sm",
  lg: "h-14 w-10 text-base",
};

const VARIANT_CLASS: Readonly<Record<TileGlyphVariant, string>> = {
  default: "",
  dimmed: "opacity-40",
  riichi: "rotate-90 ring-2 ring-amber-500",
};

export function TileGlyph({ tile, size = "md", variant = "default" }: Props) {
  const colorClass = Tile.isRed(tile) ? "text-red-600" : Tile.isHonor(tile) ? "text-emerald-900" : "text-zinc-900";
  return (
    <span
      role="img"
      aria-label={Labels.tile(tile)}
      className={`inline-flex shrink-0 select-none flex-col items-center justify-center rounded border border-zinc-400 bg-amber-50 font-semibold leading-none shadow-sm ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${colorClass}`}
    >
      <span>{Labels.tileNumber(tile)}</span>
      {Tile.isHonor(tile) ? null : <span className="text-[0.7em] font-normal">{Labels.tileSuit(tile)}</span>}
    </span>
  );
}
