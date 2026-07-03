import type { Tile } from "../tile/index.ts";
import {
  isNumberIndex,
  positionInSuit,
  TILE_KIND_COUNT,
  toCounts,
  withDelta,
  YAOCHUU_INDICES,
} from "./tile-counts.ts";

/**
 * 通常形の最小シャンテン数を求める再帰探索。
 * counts[index] 以降の牌を、面子(刻子・順子)・塔子(両面/嵌張/辺張候補・対子候補)・
 * 雀頭のいずれかとして使うか、使わずに残すかを全探索する。
 * メモ化により同じ (index, 残りcounts, melds, taatsu, hasPair) の再計算を避ける。
 */
const dfsStandard = (
  counts: readonly number[],
  index: number,
  melds: number,
  taatsu: number,
  hasPair: boolean,
  memo: Map<string, number>,
): number => {
  if (index === TILE_KIND_COUNT) {
    const cappedTaatsu = Math.min(taatsu, Math.max(0, 4 - melds));
    return 8 - melds * 2 - cappedTaatsu - (hasPair ? 1 : 0);
  }

  const key = `${index}|${melds}|${taatsu}|${hasPair ? 1 : 0}|${counts.slice(index).join(",")}`;
  const cached = memo.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // この index の牌は使わずに次へ進む(孤立牌として残す)
  let best = dfsStandard(counts, index + 1, melds, taatsu, hasPair, memo);

  const count = counts[index] ?? 0;

  if (melds < 4 && count >= 3) {
    const next = withDelta(counts, [[index, -3]]);
    best = Math.min(best, dfsStandard(next, index, melds + 1, taatsu, hasPair, memo));
  }

  if (count >= 2) {
    if (melds + taatsu < 4) {
      const next = withDelta(counts, [[index, -2]]);
      best = Math.min(best, dfsStandard(next, index, melds, taatsu + 1, hasPair, memo));
    }
    if (!hasPair) {
      const next = withDelta(counts, [[index, -2]]);
      best = Math.min(best, dfsStandard(next, index, melds, taatsu, true, memo));
    }
  }

  if (isNumberIndex(index)) {
    const pos = positionInSuit(index);

    if (melds < 4 && pos <= 6 && count >= 1 && (counts[index + 1] ?? 0) >= 1 && (counts[index + 2] ?? 0) >= 1) {
      const next = withDelta(counts, [
        [index, -1],
        [index + 1, -1],
        [index + 2, -1],
      ]);
      best = Math.min(best, dfsStandard(next, index, melds + 1, taatsu, hasPair, memo));
    }

    if (melds + taatsu < 4) {
      if (pos <= 7 && count >= 1 && (counts[index + 1] ?? 0) >= 1) {
        const next = withDelta(counts, [
          [index, -1],
          [index + 1, -1],
        ]);
        best = Math.min(best, dfsStandard(next, index, melds, taatsu + 1, hasPair, memo));
      }
      if (pos <= 6 && count >= 1 && (counts[index + 2] ?? 0) >= 1) {
        const next = withDelta(counts, [
          [index, -1],
          [index + 2, -1],
        ]);
        best = Math.min(best, dfsStandard(next, index, melds, taatsu + 1, hasPair, memo));
      }
    }
  }

  memo.set(key, best);
  return best;
};

const shantenStandard = (concealed: readonly Tile[], meldCount: number): number => {
  const counts = toCounts(concealed);
  return dfsStandard(counts, 0, meldCount, 0, false, new Map());
};

const shantenChiitoi = (concealed: readonly Tile[]): number => {
  const counts = toCounts(concealed);
  let kinds = 0;
  let pairs = 0;
  for (const count of counts) {
    if (count > 0) {
      kinds += 1;
    }
    if (count >= 2) {
      pairs += 1;
    }
  }
  return 6 - pairs + Math.max(0, 7 - kinds);
};

const shantenKokushi = (concealed: readonly Tile[]): number => {
  const counts = toCounts(concealed);
  const presentKinds = YAOCHUU_INDICES.filter((index) => (counts[index] ?? 0) >= 1).length;
  const hasPair = YAOCHUU_INDICES.some((index) => (counts[index] ?? 0) >= 2);
  return 13 - presentKinds - (hasPair ? 1 : 0);
};

export const shanten = (concealed: readonly Tile[], meldCount: number): number => {
  const standard = shantenStandard(concealed, meldCount);
  if (meldCount !== 0) {
    return standard;
  }
  return Math.min(standard, shantenChiitoi(concealed), shantenKokushi(concealed));
};
