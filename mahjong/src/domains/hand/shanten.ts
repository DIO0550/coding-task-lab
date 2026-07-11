import type { Tile } from "../tile/index.ts";
import {
  YAOCHU_INDICES,
  isAdjacentStart,
  isRunStart,
  toCounts,
  withoutRuns,
  withoutTiles,
  type TileCounts,
} from "./counts.ts";

const WORST_SHANTEN = 8;

const MAX_BLOCKS = 4;

/**
 * 面子・搭子・対子の採用数からシャンテン数を評価する。
 * 対子は1つを雀頭(head)に充て、残りは搭子(partial)として扱う。
 * 搭子は面子数との合計が4ブロックを超える分を切り捨てる。
 */
const evaluate = (
  meldCount: number,
  sets: number,
  partials: number,
  pairs: number,
): number => {
  const totalSets = Math.min(meldCount + sets, MAX_BLOCKS);
  const head = pairs > 0 ? 1 : 0;
  const partialCandidates = partials + pairs - head;
  const usablePartials = Math.max(
    0,
    Math.min(partialCandidates, MAX_BLOCKS - totalSets),
  );
  return WORST_SHANTEN - totalSets * 2 - usablePartials - head;
};

/**
 * 面子(刻子/順子)と搭子(対子/両面・辺張/嵌張)の取り方を全探索し、
 * 通常形シャンテンの最小値を返す。各 index の牌は「その index を先頭とする
 * ブロック」でしか使われないため、index 昇順の探索で全candidateを尽くせる。
 */
const searchNormal = (
  counts: TileCounts,
  index: number,
  meldCount: number,
  sets: number,
  partials: number,
  pairs: number,
): number => {
  if (index >= counts.length) {
    return evaluate(meldCount, sets, partials, pairs);
  }
  const count = counts[index];
  if (count === 0) {
    return searchNormal(counts, index + 1, meldCount, sets, partials, pairs);
  }
  const candidates: number[] = [
    // この牌を面子・搭子に使わず浮かせる
    searchNormal(counts, index + 1, meldCount, sets, partials, pairs),
  ];
  if (count >= 3) {
    candidates.push(
      searchNormal(
        withoutTiles(counts, index, 3),
        index,
        meldCount,
        sets + 1,
        partials,
        pairs,
      ),
    );
  }
  if (count >= 2) {
    candidates.push(
      searchNormal(
        withoutTiles(counts, index, 2),
        index,
        meldCount,
        sets,
        partials,
        pairs + 1,
      ),
    );
  }
  if (isRunStart(index) && counts[index + 1] >= 1 && counts[index + 2] >= 1) {
    candidates.push(
      searchNormal(
        withoutRuns(counts, index, 1),
        index,
        meldCount,
        sets + 1,
        partials,
        pairs,
      ),
    );
  }
  if (isAdjacentStart(index) && counts[index + 1] >= 1) {
    candidates.push(
      searchNormal(
        withoutTiles(withoutTiles(counts, index, 1), index + 1, 1),
        index,
        meldCount,
        sets,
        partials + 1,
        pairs,
      ),
    );
  }
  if (isRunStart(index) && counts[index + 2] >= 1) {
    candidates.push(
      searchNormal(
        withoutTiles(withoutTiles(counts, index, 1), index + 2, 1),
        index,
        meldCount,
        sets,
        partials + 1,
        pairs,
      ),
    );
  }
  return Math.min(...candidates);
};

/** 通常形(4面子1雀頭)のシャンテン数。副露は完成面子として算入する */
export const normalShanten = (
  concealed: readonly Tile[],
  meldCount: number,
): number => searchNormal(toCounts(concealed), 0, meldCount, 0, 0, 0);

/** 七対子のシャンテン数(異なる7種の対子)。面前手のみ */
export const chiitoitsuShanten = (concealed: readonly Tile[]): number => {
  const counts = toCounts(concealed);
  const kinds = counts.filter((count) => count >= 1).length;
  const pairs = counts.filter((count) => count >= 2).length;
  return 6 - pairs + Math.max(0, 7 - kinds);
};

/** 国士無双のシャンテン数。面前手のみ */
export const kokushiShanten = (concealed: readonly Tile[]): number => {
  const counts = toCounts(concealed);
  const kinds = YAOCHU_INDICES.filter((index) => counts[index] >= 1).length;
  const hasPair = YAOCHU_INDICES.some((index) => counts[index] >= 2);
  return 13 - kinds - (hasPair ? 1 : 0);
};

/**
 * 通常形・七対子・国士無双の最小シャンテン数。和了=-1、テンパイ=0。
 * 七対子・国士は面前(副露なし)のときのみ候補になる。
 */
export const minimumShanten = (
  concealed: readonly Tile[],
  meldCount: number,
): number => {
  const normal = normalShanten(concealed, meldCount);
  if (meldCount > 0) {
    return normal;
  }
  return Math.min(
    normal,
    chiitoitsuShanten(concealed),
    kokushiShanten(concealed),
  );
};
