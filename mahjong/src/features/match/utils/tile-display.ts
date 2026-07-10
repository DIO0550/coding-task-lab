import type { Tile } from "@/src/domains/tile/index.ts";

const SUIT_KANJI: Readonly<Record<"m" | "p" | "s", string>> = {
  m: "萬",
  p: "筒",
  s: "索",
};

const HONOR_KANJI: Readonly<Record<string, string>> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
  haku: "白",
  hatsu: "發",
  chun: "中",
};

/** 赤ドラかどうか(表示のハイライト用)。 */
export const isRedTile = (tile: Tile): boolean => tile.kind === "number" && tile.red;

/** 牌を日本語表記(例: "1萬" "5筒(赤)" "東")に変換する、表示専用の純粋関数。 */
export const formatTileLabel = (tile: Tile): string => {
  if (tile.kind === "honor") {
    return HONOR_KANJI[tile.honor] ?? tile.honor;
  }
  const suffix = isRedTile(tile) ? "(赤)" : "";
  return `${tile.rank}${SUIT_KANJI[tile.suit]}${suffix}`;
};
