import { Hand } from "../../../../domains/hand/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import { TileCounts } from "../../../../domains/tile-counts/index.ts";
import { TableInfo } from "../table/index.ts";

/** ドラ1枚あたりの見込み点。 */
const DORA_POINT = 4;
/** 役牌の刻子の見込み点。 */
const VALUE_SET_POINT = 4;
/** 役牌の対子の見込み点。 */
const VALUE_PAIR_POINT = 2;
/** タンヤオの見込み点。 */
const TANYAO_POINT = 2;
/** 混一色の見込み点。 */
const HONITSU_POINT = 4;
/** 清一色の見込み点。 */
const CHINITSU_POINT = 6;
/** 対々和の見込み点。 */
const TOITOI_POINT = 2;

const SET_SIZE = 3;
const PAIR_SIZE = 2;
/** 対々和を狙えるとみなす対子の種類数。 */
const TOITOI_PAIR_KINDS = 3;

const numberSuitCount = (tiles: readonly Tile[]): number =>
  new Set(
    tiles.filter((tile) => !Tile.isHonor(tile)).map((tile) => tile.suit),
  ).size;

const isTanyaoShape = (tiles: readonly Tile[]): boolean =>
  tiles.every((tile) => Tile.isSimple(tile));

const isFlushShape = (tiles: readonly Tile[]): boolean =>
  numberSuitCount(tiles) <= 1;

const flushPoints = (tiles: readonly Tile[]): number => {
  if (!isFlushShape(tiles)) {
    return 0;
  }
  return tiles.some((tile) => Tile.isHonor(tile))
    ? HONITSU_POINT
    : CHINITSU_POINT;
};

const countOf = (counts: TileCounts, tile: Tile): number =>
  counts[Tile.toIndex(tile)];

const valueTilePoint = (count: number): number => {
  if (count >= SET_SIZE) {
    return VALUE_SET_POINT;
  }
  return count === PAIR_SIZE ? VALUE_PAIR_POINT : 0;
};

const valueTilePoints = (tiles: readonly Tile[], info: TableInfo): number => {
  const counts = TileCounts.fromTiles(tiles);
  return info.valueTiles.reduce(
    (sum, tile) => sum + valueTilePoint(countOf(counts, tile)),
    0,
  );
};

const hasValueSet = (tiles: readonly Tile[], info: TableInfo): boolean => {
  const counts = TileCounts.fromTiles(tiles);
  return info.valueTiles.some((tile) => countOf(counts, tile) >= SET_SIZE);
};

const pairKindCount = (tiles: readonly Tile[]): number =>
  TileCounts.fromTiles(tiles).filter((count) => count >= PAIR_SIZE).length;

/** 副露済みで、順子の副露が無く、対子が多い(対々和を狙える)形か。 */
const isToitoiShape = (hand: Hand): boolean =>
  hand.melds.length > 0 &&
  hand.melds.every((meld) => meld.type !== "chi") &&
  pairKindCount(hand.concealed) >= TOITOI_PAIR_KINDS;

export const HandValue = {
  /**
   * 手牌の打点の見込み。数値が大きいほど高打点が期待できる。
   * ドラ枚数と、狙える役(役牌・タンヤオ・混一色・対々和)から見積もる。
   */
  estimate(hand: Hand, info: TableInfo): number {
    const tiles = Hand.allTiles(hand);
    const tanyao = isTanyaoShape(tiles) ? TANYAO_POINT : 0;
    const toitoi = isToitoiShape(hand) ? TOITOI_POINT : 0;
    return (
      TableInfo.doraCount(info, tiles) * DORA_POINT +
      valueTilePoints(tiles, info) +
      tanyao +
      flushPoints(tiles) +
      toitoi
    );
  },

  /**
   * 鳴いた後の手として役が見込めるか。
   * 門前限定の役(リーチ・七対子など)は数えないため、鳴きの判断にのみ使う。
   */
  hasYakuProspect(hand: Hand, info: TableInfo): boolean {
    const tiles = Hand.allTiles(hand);
    if (hasValueSet(tiles, info)) {
      return true;
    }
    if (isTanyaoShape(tiles)) {
      return true;
    }
    return isFlushShape(tiles) || isToitoiShape(hand);
  },
} as const;
