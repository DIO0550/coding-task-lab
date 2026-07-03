import { TILE_KIND_COUNT, type TileIndex } from "@/src/domains/tile";

const YAOCHUU_INDEXES: readonly TileIndex[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

/** 通常形(4面子1雀頭)のシャンテン数。和了は -1 */
export const standardShanten = (
  concealedCounts: readonly number[],
  meldCount: number,
): number => {
  const counts = [...concealedCounts];
  const state = { best: 8 };

  const evaluate = (sets: number, pairs: number, partials: number): void => {
    const cappedPartials = Math.min(partials, 4 - sets);
    const shanten = 8 - 2 * sets - cappedPartials - pairs;
    if (shanten < state.best) {
      state.best = shanten;
    }
  };

  const dfs = (
    index: number,
    sets: number,
    pairs: number,
    partials: number,
  ): void => {
    if (state.best === -1) {
      return;
    }
    if (index === TILE_KIND_COUNT) {
      evaluate(sets, pairs, partials);
      return;
    }
    if (counts[index] === 0) {
      dfs(index + 1, sets, pairs, partials);
      return;
    }

    if (counts[index] >= 3) {
      counts[index] -= 3;
      dfs(index, sets + 1, pairs, partials);
      counts[index] += 3;
    }
    const inSuit = index < 27;
    if (inSuit && index % 9 <= 6 && counts[index + 1] > 0 && counts[index + 2] > 0) {
      counts[index] -= 1;
      counts[index + 1] -= 1;
      counts[index + 2] -= 1;
      dfs(index, sets + 1, pairs, partials);
      counts[index] += 1;
      counts[index + 1] += 1;
      counts[index + 2] += 1;
    }
    if (counts[index] >= 2) {
      if (pairs === 0) {
        counts[index] -= 2;
        dfs(index, sets, 1, partials);
        counts[index] += 2;
      }
      if (sets + partials < 4) {
        counts[index] -= 2;
        dfs(index, sets, pairs, partials + 1);
        counts[index] += 2;
      }
    }
    if (sets + partials < 4 && inSuit && index % 9 <= 7 && counts[index + 1] > 0) {
      counts[index] -= 1;
      counts[index + 1] -= 1;
      dfs(index, sets, pairs, partials + 1);
      counts[index] += 1;
      counts[index + 1] += 1;
    }
    if (sets + partials < 4 && inSuit && index % 9 <= 6 && counts[index + 2] > 0) {
      counts[index] -= 1;
      counts[index + 2] -= 1;
      dfs(index, sets, pairs, partials + 1);
      counts[index] += 1;
      counts[index + 2] += 1;
    }
    // この牌を使わない選択肢
    dfs(index + 1, sets, pairs, partials);
  };

  dfs(0, meldCount, 0, 0);
  return state.best;
};

/** 七対子のシャンテン数。副露があれば成立しない前提で呼び出すこと */
export const chiitoitsuShanten = (concealedCounts: readonly number[]): number => {
  const kinds = concealedCounts.filter((count) => count > 0).length;
  const pairs = concealedCounts.filter((count) => count >= 2).length;
  return 6 - pairs + Math.max(0, 7 - kinds);
};

/** 国士無双のシャンテン数。副露があれば成立しない前提で呼び出すこと */
export const kokushiShanten = (concealedCounts: readonly number[]): number => {
  const kinds = YAOCHUU_INDEXES.filter((i) => concealedCounts[i] > 0).length;
  const hasPair = YAOCHUU_INDEXES.some((i) => concealedCounts[i] >= 2);
  return 13 - kinds - (hasPair ? 1 : 0);
};
