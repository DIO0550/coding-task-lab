import { Tile } from "../tile/index.ts";

export const TILE_KIND_COUNT = 34;

/** 么九牌(老頭牌+字牌)の index34 一覧。国士無双の判定・シャンテン計算で使う。 */
export const YAOCHUU_INDICES: readonly number[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

/** 34種の牌それぞれの枚数を数える(引数は破壊しない)。 */
export const toCounts = (tiles: readonly Tile[]): readonly number[] => {
  const counts = new Array<number>(TILE_KIND_COUNT).fill(0);
  for (const tile of tiles) {
    const index = Tile.toIndex34(tile);
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
};

/** counts の index の枚数だけ delta を加算した新しい配列を返す(破壊的変更なし)。 */
export const withDelta = (
  counts: readonly number[],
  deltas: readonly (readonly [number, number])[],
): readonly number[] => {
  const next = [...counts];
  for (const [index, delta] of deltas) {
    next[index] = (next[index] ?? 0) + delta;
  }
  return next;
};

/** index34 が数牌(萬子・筒子・索子)かどうか。 */
export const isNumberIndex = (index: number): boolean => index < 27;

/** 数牌の index34 について、同じ色の中での位置(0=1,...,8=9)を返す。 */
export const positionInSuit = (index: number): number => index % 9;

/**
 * 34種の牌ごとに、実際に手牌に含まれる Tile インスタンス(赤フラグ等を保持)を
 * Tile.compare 順に並べてグループ化する。同じ index34 の牌を複数回「使用」する際に
 * 先頭から順番に取り出すための供給源として使う。
 */
export const groupByIndex = (tiles: readonly Tile[]): readonly (readonly Tile[])[] => {
  const groups: Tile[][] = Array.from({ length: TILE_KIND_COUNT }, () => []);
  for (const tile of tiles) {
    groups[Tile.toIndex34(tile)]?.push(tile);
  }
  return groups.map((group) => group.toSorted(Tile.compare));
};

/** 牌の消費状況を追跡しつつ、指定した index の牌を count 枚だけ取り出す供給源。 */
export type TilePool = Readonly<{
  take: (index: number, count: number) => readonly Tile[];
}>;

/** 手牌から TilePool を作る(class を使わずクロージャで消費状態を保持する)。 */
export const createTilePool = (tiles: readonly Tile[]): TilePool => {
  const groups = groupByIndex(tiles);
  const used = new Array<number>(TILE_KIND_COUNT).fill(0);

  const take = (index: number, count: number): readonly Tile[] => {
    const group = groups[index] ?? [];
    const start = used[index] ?? 0;
    used[index] = start + count;
    return group.slice(start, start + count);
  };

  return { take };
};
