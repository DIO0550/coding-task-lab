import { Hand, ORPHAN_INDEXES, Shanten } from "../../../../domains/hand/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import { TileCounts } from "../../../../domains/tile-counts/index.ts";
import type { PlayerView } from "../../view/index.ts";
import { Safety } from "../safety/index.ts";
import { TableInfo } from "../table/index.ts";
import { HandValue } from "../value/index.ts";

/** 1枚の打牌候補の評価。 */
export type DiscardCandidate = Readonly<{
  /** 純手牌での位置。 */
  index: number;
  tile: Tile;
  /** 切った後のシャンテン数。 */
  shanten: number;
  /**
   * 切った後の受け入れ枚数(まだ見えていない有効牌の合計)。
   * シャンテン数が最小の候補についてのみ数える(それ以外は選ばれないため0)。
   */
  acceptance: number;
  /** 切った後に手元へ残るドラ(赤ドラを含む)の枚数。 */
  doraCount: number;
  /** 切った後の打点の見込み。 */
  value: number;
  /** 不要牌らしさ。小さいほど不要な牌(孤立した客風が最小)。 */
  isolation: number;
  /** リーチしている他家に対する危険度。0は現物。 */
  danger: number;
}>;

/** 打牌候補の優先順を決める比較キー。小さいほど優先して切る。 */
export type DiscardRanking = (candidate: DiscardCandidate) => readonly number[];

/** 孤立牌の不要度。 */
const ISOLATED = 0;
/** 周りと繋がっている牌の不要度。 */
const CONNECTED = 10;

/** 客風牌の不要度。 */
const GUEST_WIND_RANK = 0;
/** 役牌の不要度。 */
const VALUE_HONOR_RANK = 1;
/** 老頭牌の不要度。 */
const TERMINAL_RANK = 2;
/** 中張牌の不要度。 */
const SIMPLE_RANK = 3;

/** 数牌が繋がっているとみなす距離。 */
const NEIGHBOR_OFFSETS: readonly number[] = [-2, -1, 1, 2];
const MIN_RANK = 1;
const MAX_NUMBER_RANK = 9;

const neighborKinds = (kind: number): readonly number[] => {
  const tile = Tile.fromIndex(kind);
  if (Tile.isHonor(tile)) {
    return [];
  }
  return NEIGHBOR_OFFSETS.map((offset) => tile.rank + offset)
    .filter((rank) => rank >= MIN_RANK && rank <= MAX_NUMBER_RANK)
    .map((rank) => Tile.toIndex({ suit: tile.suit, rank, red: false }));
};

const isIsolated = (counts: TileCounts, tile: Tile): boolean => {
  const kind = Tile.toIndex(tile);
  if (counts[kind] > 1) {
    return false;
  }
  return neighborKinds(kind).every((neighbor) => counts[neighbor] === 0);
};

const tileRank = (info: TableInfo, tile: Tile): number => {
  if (Tile.isHonor(tile)) {
    return TableInfo.isValueTile(info, tile) ? VALUE_HONOR_RANK : GUEST_WIND_RANK;
  }
  return Tile.isTerminal(tile) ? TERMINAL_RANK : SIMPLE_RANK;
};

const isolationOf = (
  counts: TileCounts,
  info: TableInfo,
  tile: Tile,
): number =>
  (isIsolated(counts, tile) ? ISOLATED : CONNECTED) + tileRank(info, tile);

/**
 * シャンテン数を進め得る牌の候補。
 * 手牌にある牌・その周辺の数牌・(門前なら)么九牌に限られる。
 */
const probeKinds = (
  counts: TileCounts,
  meldCount: number,
): readonly number[] => {
  const present = TileCounts.presentIndexes(counts);
  const orphans = meldCount === 0 ? ORPHAN_INDEXES : [];
  return [
    ...new Set([
      ...present,
      ...present.flatMap((kind) => neighborKinds(kind)),
      ...orphans,
    ]),
  ];
};

/** 捨てた後の手牌に対する、まだ見えていない有効牌の合計枚数。 */
const acceptanceOf = (
  counts: TileCounts,
  meldCount: number,
  info: TableInfo,
  shanten: number,
): number =>
  probeKinds(counts, meldCount).reduce((sum, kind) => {
    const remaining = TableInfo.remaining(info, Tile.fromIndex(kind));
    const useful =
      remaining > 0 &&
      Shanten.of(TileCounts.add(counts, kind), meldCount) < shanten;
    return useful ? sum + remaining : sum;
  }, 0);

const distinctKinds = (
  hand: Hand,
  indexes: readonly number[],
): readonly number[] => [
  ...new Set(indexes.map((index) => Tile.toIndex(hand.concealed[index]))),
];

const shantenByKind = (
  counts: TileCounts,
  meldCount: number,
  kinds: readonly number[],
): ReadonlyMap<number, number> =>
  new Map(
    kinds.map((kind) => [
      kind,
      Shanten.of(TileCounts.remove(counts, kind), meldCount),
    ]),
  );

const acceptanceByKind = (
  counts: TileCounts,
  meldCount: number,
  info: TableInfo,
  kinds: readonly number[],
  shantenMap: ReadonlyMap<number, number>,
  best: number,
): ReadonlyMap<number, number> =>
  new Map(
    kinds
      .filter((kind) => shantenMap.get(kind) === best)
      .map((kind) => [
        kind,
        acceptanceOf(TileCounts.remove(counts, kind), meldCount, info, best),
      ]),
  );

const compareKeys = (
  left: readonly number[],
  right: readonly number[],
): number => {
  const difference = left
    .map((value, position) => value - right[position])
    .find((value) => value !== 0);
  return difference ?? 0;
};

export const DiscardCandidate = {
  /** 捨てられる位置ごとの評価一覧。 */
  list(
    view: PlayerView,
    info: TableInfo,
    indexes: readonly number[],
  ): readonly DiscardCandidate[] {
    if (indexes.length === 0) {
      return [];
    }
    const hand = view.hand;
    const counts = Hand.counts(hand);
    const meldCount = hand.melds.length;
    const kinds = distinctKinds(hand, indexes);
    const shantenMap = shantenByKind(counts, meldCount, kinds);
    const best = Math.min(...shantenMap.values());
    const acceptMap = acceptanceByKind(
      counts,
      meldCount,
      info,
      kinds,
      shantenMap,
      best,
    );
    return indexes.map((index) => {
      const tile = hand.concealed[index];
      const kind = Tile.toIndex(tile);
      const after = Hand.removeAt(hand, index);
      return {
        index,
        tile,
        shanten: shantenMap.get(kind) ?? best,
        acceptance: acceptMap.get(kind) ?? 0,
        doraCount: TableInfo.doraCount(info, Hand.allTiles(after)),
        value: HandValue.estimate(after, info),
        isolation: isolationOf(counts, info, tile),
        danger: Safety.danger(view, info, tile),
      };
    });
  },

  /** 一覧の中の最小シャンテン数。 */
  minShanten(candidates: readonly DiscardCandidate[]): number {
    return candidates.reduce(
      (lowest, candidate) => Math.min(lowest, candidate.shanten),
      Number.POSITIVE_INFINITY,
    );
  },

  /** 比較キーが最も小さい候補。候補が無ければ null。 */
  best(
    candidates: readonly DiscardCandidate[],
    ranking: DiscardRanking,
  ): DiscardCandidate | null {
    return candidates.reduce<DiscardCandidate | null>((chosen, candidate) => {
      if (chosen === null) {
        return candidate;
      }
      return compareKeys(ranking(candidate), ranking(chosen)) < 0
        ? candidate
        : chosen;
    }, null);
  },
} as const;
