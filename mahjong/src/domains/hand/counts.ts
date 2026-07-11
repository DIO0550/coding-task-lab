import type { Suit, Tile } from "../tile/index.ts";

/**
 * 牌種(34種)ごとの枚数配列。添字は m1..m9=0..8, p1..p9=9..17,
 * s1..s9=18..26, z1..z7=27..33。
 */
export type TileCounts = readonly number[];

export const TILE_KIND_COUNT = 34;

const SUIT_OFFSET: Readonly<Record<Suit, number>> = { m: 0, p: 9, s: 18, z: 27 };

const HONOR_OFFSET = 27;

const RANKS_PER_SUIT = 9;

/** 幺九牌(数牌1/9・字牌)の牌種添字 */
export const YAOCHU_INDICES: readonly number[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

export const tileToIndex = (tile: Tile): number =>
  SUIT_OFFSET[tile.suit] + tile.rank - 1;

export const indexToTile = (index: number): Tile => {
  if (index >= HONOR_OFFSET) {
    return { suit: "z", rank: index - HONOR_OFFSET + 1, red: false };
  }
  const suit = index < RANKS_PER_SUIT ? "m" : index < RANKS_PER_SUIT * 2 ? "p" : "s";
  return { suit, rank: (index % RANKS_PER_SUIT) + 1, red: false };
};

export const toCounts = (tiles: readonly Tile[]): TileCounts => {
  const counts = new Array<number>(TILE_KIND_COUNT).fill(0);
  for (const tile of tiles) {
    counts[tileToIndex(tile)] += 1;
  }
  return counts;
};

/** その添字を先頭とする順子(index, index+1, index+2)が構成可能な位置か */
export const isRunStart = (index: number): boolean =>
  index < HONOR_OFFSET && index % RANKS_PER_SUIT <= 6;

/** その添字を先頭とする搭子(index, index+1)が構成可能な位置か */
export const isAdjacentStart = (index: number): boolean =>
  index < HONOR_OFFSET && index % RANKS_PER_SUIT <= 7;

/** index の牌を amount 枚除いた新しい枚数配列を返す */
export const withoutTiles = (
  counts: TileCounts,
  index: number,
  amount: number,
): TileCounts => counts.map((count, i) => (i === index ? count - amount : count));

/** start を先頭とする順子を amount 組除いた新しい枚数配列を返す */
export const withoutRuns = (
  counts: TileCounts,
  start: number,
  amount: number,
): TileCounts =>
  counts.map((count, i) =>
    i >= start && i <= start + 2 ? count - amount : count,
  );
