import { Tile, TILE_KIND_COUNT } from "../tile/index.ts";

/** 牌種インデックス(0〜33)ごとの枚数。赤ドラの区別は保持しない。 */
export type TileCounts = readonly number[];

/** 1種類あたりの最大枚数。 */
export const MAX_TILE_DUPLICATES = 4;

export const TileCounts = {
  /** すべて0の枚数表。 */
  empty(): TileCounts {
    return new Array<number>(TILE_KIND_COUNT).fill(0);
  },

  /** 牌の配列から枚数表を作る。 */
  fromTiles(tiles: readonly Tile[]): TileCounts {
    return tiles.reduce<readonly number[]>(
      (counts, tile) => TileCounts.add(counts, Tile.toIndex(tile)),
      TileCounts.empty(),
    );
  },

  /** 指定した牌種を1枚増やした新しい枚数表。 */
  add(counts: TileCounts, index: number, amount = 1): TileCounts {
    return counts.map((value, current) =>
      current === index ? value + amount : value,
    );
  },

  /** 指定した牌種を1枚減らした新しい枚数表。 */
  remove(counts: TileCounts, index: number, amount = 1): TileCounts {
    return TileCounts.add(counts, index, -amount);
  },

  /** 合計枚数。 */
  total(counts: TileCounts): number {
    return counts.reduce((sum, value) => sum + value, 0);
  },

  /** 枚数表を牌の配列(赤なし・昇順)へ変換する。 */
  toTiles(counts: TileCounts): readonly Tile[] {
    return counts.flatMap((count, index) =>
      Array.from({ length: count }, () => Tile.fromIndex(index)),
    );
  },

  /** 1種5枚以上が存在しないか。 */
  isWithinDuplicateLimit(counts: TileCounts): boolean {
    return counts.every((count) => count <= MAX_TILE_DUPLICATES);
  },

  /** 枚数が1枚以上ある牌種インデックスの一覧。 */
  presentIndexes(counts: TileCounts): readonly number[] {
    return counts.flatMap((count, index) => (count > 0 ? [index] : []));
  },
} as const;
