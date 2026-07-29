import { Block } from "../../block/index.ts";
import { TileCounts } from "../../tile-counts/index.ts";

/** 純手牌を「面子 + 雀頭」に分解した1通りの解釈。 */
export type Decomposition = Readonly<{
  sets: readonly Block[];
  pair: Block;
}>;

/** 么九牌の牌種インデックス(国士無双の構成牌)。 */
export const ORPHAN_INDEXES: readonly number[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

const SEVEN_PAIRS_TILE_COUNT = 14;

const EMPTY_SETS: readonly (readonly Block[])[] = [[]];

const firstPresent = (counts: TileCounts): number =>
  counts.findIndex((count) => count > 0);

/** その牌種を先頭とする順子が作れるか。 */
const canFormRun = (counts: TileCounts, index: number): boolean => {
  if (index >= 27) {
    return false;
  }
  if (index % 9 > 6) {
    return false;
  }
  return counts[index + 1] > 0 && counts[index + 2] > 0;
};

const removeRun = (counts: TileCounts, index: number): TileCounts =>
  TileCounts.remove(TileCounts.remove(TileCounts.remove(counts, index), index + 1), index + 2);

/**
 * 残り枚数表から面子を `remaining` 個取り出す全パターンを列挙する。
 * 常に「最も小さい未使用の牌種」から消費するため、同じ分解が重複して現れない。
 */
const extractSets = (
  counts: TileCounts,
  remaining: number,
): readonly (readonly Block[])[] => {
  const index = firstPresent(counts);
  if (index < 0) {
    return remaining === 0 ? EMPTY_SETS : [];
  }
  if (remaining === 0) {
    return [];
  }

  const withTriplet =
    counts[index] >= 3
      ? extractSets(TileCounts.remove(counts, index, 3), remaining - 1).map(
          (rest) => [Block.triplet(index, true), ...rest],
        )
      : [];

  const withRun = canFormRun(counts, index)
    ? extractSets(removeRun(counts, index), remaining - 1).map((rest) => [
        Block.run(index, true),
        ...rest,
      ])
    : [];

  return [...withTriplet, ...withRun];
};

export const Decomposition = {
  /**
   * 通常形への分解を全通り返す。
   * `setCount` は純手牌から作るべき面子の数(4 - 副露数)。
   */
  standard(counts: TileCounts, setCount: number): readonly Decomposition[] {
    if (TileCounts.total(counts) !== setCount * 3 + 2) {
      return [];
    }
    return TileCounts.presentIndexes(counts)
      .filter((index) => counts[index] >= 2)
      .flatMap((pairIndex) =>
        extractSets(TileCounts.remove(counts, pairIndex, 2), setCount).map(
          (sets) => ({ sets, pair: Block.pair(pairIndex) }),
        ),
      );
  },

  /** 七対子の対子7つ。成立しなければ null。 */
  sevenPairs(counts: TileCounts): readonly Block[] | null {
    if (TileCounts.total(counts) !== SEVEN_PAIRS_TILE_COUNT) {
      return null;
    }
    const pairIndexes = counts.flatMap((count, index) =>
      count === 2 ? [index] : [],
    );
    return pairIndexes.length === 7
      ? pairIndexes.map((index) => Block.pair(index))
      : null;
  },

  /** 国士無双が成立するか。 */
  isThirteenOrphans(counts: TileCounts): boolean {
    if (TileCounts.total(counts) !== SEVEN_PAIRS_TILE_COUNT) {
      return false;
    }
    const onlyOrphans = counts.every(
      (count, index) => count === 0 || ORPHAN_INDEXES.includes(index),
    );
    return onlyOrphans && ORPHAN_INDEXES.every((index) => counts[index] >= 1);
  },

  /** 分解結果のブロック一覧(面子 + 雀頭)。 */
  blocks(decomposition: Decomposition): readonly Block[] {
    return [...decomposition.sets, decomposition.pair];
  },
} as const;
