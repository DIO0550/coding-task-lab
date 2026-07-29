import { TileCounts } from "../../tile-counts/index.ts";
import { ORPHAN_INDEXES } from "../decomposition/index.ts";

/** シャンテン数。-1 が和了、0 がテンパイ。 */
export type Shanten = number;

/** 和了しているときのシャンテン数。 */
export const WINNING_SHANTEN = -1;

/** テンパイのシャンテン数。 */
export const TENPAI_SHANTEN = 0;

/** 何も揃っていない手牌のシャンテン数。 */
const MAX_SHANTEN = 8;

const MAX_BLOCKS = 5;
const MAX_SETS = 4;
const HONOR_START = 27;

/** 面子数・搭子数・対子数から通常形のシャンテン数を求める。 */
const evaluate = (
  sets: number,
  partials: number,
  pairs: number,
  meldCount: number,
): number => {
  const totalSets = sets + meldCount;
  const head = pairs > 0 ? 1 : 0;
  const usable = Math.max(0, Math.min(partials - head, MAX_SETS - totalSets));
  return 8 - 2 * totalSets - usable - head;
};

const firstPresentFrom = (counts: readonly number[], start: number): number => {
  for (let index = start; index < counts.length; index += 1) {
    if (counts[index] > 0) {
      return index;
    }
  }
  return -1;
};

const canFormRun = (counts: readonly number[], index: number): boolean =>
  index < HONOR_START &&
  index % 9 <= 6 &&
  counts[index + 1] > 0 &&
  counts[index + 2] > 0;

const canFormAdjacent = (counts: readonly number[], index: number): boolean =>
  index < HONOR_START && index % 9 <= 7 && counts[index + 1] > 0;

const canFormGapped = (counts: readonly number[], index: number): boolean =>
  index < HONOR_START && index % 9 <= 6 && counts[index + 2] > 0;

/**
 * 「最も小さい未使用の牌種」を面子・搭子・孤立牌のいずれとして使うかを全通り試し、
 * 最小のシャンテン数を返す。
 *
 * 探索量が多いため、呼び出し元で複製した作業用配列を破壊しながら
 * バックトラックする(引数として渡された枚数表は変更しない)。
 */
const searchFrom = (
  counts: number[],
  start: number,
  sets: number,
  partials: number,
  pairs: number,
  meldCount: number,
): number => {
  const index = firstPresentFrom(counts, start);
  if (index < 0) {
    return evaluate(sets, partials, pairs, meldCount);
  }

  const setRoom = sets + meldCount < MAX_SETS;
  const blockRoom = sets + partials + meldCount < MAX_BLOCKS;
  let best = MAX_SHANTEN;

  if (setRoom && counts[index] >= 3) {
    counts[index] -= 3;
    best = searchFrom(counts, index, sets + 1, partials, pairs, meldCount);
    counts[index] += 3;
  }

  if (setRoom && canFormRun(counts, index)) {
    counts[index] -= 1;
    counts[index + 1] -= 1;
    counts[index + 2] -= 1;
    const found = searchFrom(counts, index, sets + 1, partials, pairs, meldCount);
    counts[index] += 1;
    counts[index + 1] += 1;
    counts[index + 2] += 1;
    best = Math.min(best, found);
  }

  if (blockRoom && counts[index] >= 2) {
    counts[index] -= 2;
    const found = searchFrom(
      counts,
      index,
      sets,
      partials + 1,
      pairs + 1,
      meldCount,
    );
    counts[index] += 2;
    best = Math.min(best, found);
  }

  if (blockRoom && canFormAdjacent(counts, index)) {
    counts[index] -= 1;
    counts[index + 1] -= 1;
    const found = searchFrom(counts, index, sets, partials + 1, pairs, meldCount);
    counts[index] += 1;
    counts[index + 1] += 1;
    best = Math.min(best, found);
  }

  if (blockRoom && canFormGapped(counts, index)) {
    counts[index] -= 1;
    counts[index + 2] -= 1;
    const found = searchFrom(counts, index, sets, partials + 1, pairs, meldCount);
    counts[index] += 1;
    counts[index + 2] += 1;
    best = Math.min(best, found);
  }

  counts[index] -= 1;
  const skipped = searchFrom(counts, index, sets, partials, pairs, meldCount);
  counts[index] += 1;
  return Math.min(best, skipped);
};

export const Shanten = {
  /** 通常形のシャンテン数。 */
  standard(counts: TileCounts, meldCount: number): Shanten {
    return searchFrom([...counts], 0, 0, 0, 0, meldCount);
  },

  /** 七対子のシャンテン数(門前のみ)。 */
  sevenPairs(counts: TileCounts): Shanten {
    const pairs = counts.filter((count) => count >= 2).length;
    const kinds = counts.filter((count) => count >= 1).length;
    return 6 - pairs + Math.max(0, 7 - kinds);
  },

  /** 国士無双のシャンテン数(門前のみ)。 */
  thirteenOrphans(counts: TileCounts): Shanten {
    const kinds = ORPHAN_INDEXES.filter((index) => counts[index] >= 1).length;
    const hasPair = ORPHAN_INDEXES.some((index) => counts[index] >= 2);
    return 13 - kinds - (hasPair ? 1 : 0);
  },

  /** 手牌全体のシャンテン数。副露がある場合は通常形のみで判定する。 */
  of(counts: TileCounts, meldCount: number): Shanten {
    const standard = Shanten.standard(counts, meldCount);
    if (meldCount > 0) {
      return standard;
    }
    return Math.min(
      standard,
      Shanten.sevenPairs(counts),
      Shanten.thirteenOrphans(counts),
    );
  },
} as const;
