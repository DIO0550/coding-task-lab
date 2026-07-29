import { River } from "../../../../domains/river/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import type { PlayerView } from "../../view/index.ts";
import { TableInfo } from "../table/index.ts";

/** 現物の危険度。 */
const GENBUTSU_DANGER = 0;

/** 数牌の基本危険度(1〜9)。 */
const NUMBER_DANGER: readonly number[] = [8, 11, 13, 15, 15, 15, 13, 11, 8];

/** 残り1枚以下の字牌の危険度。 */
const SAFE_HONOR_DANGER = 2;
/** 残り2枚の字牌の危険度。 */
const QUIET_HONOR_DANGER = 5;
/** 残り3枚以上の字牌の危険度。 */
const LIVE_HONOR_DANGER = 8;

const QUIET_HONOR_REMAINING = 2;

/** 両筋の割引率(%)。 */
const BOTH_SUJI_PERCENT = 50;
/** 中張牌の片筋の割引率(%)。 */
const SINGLE_SUJI_PERCENT = 80;
/** 端寄りの牌の筋の割引率(%)。 */
const EDGE_SUJI_PERCENT = 60;
const FULL_PERCENT = 100;

/** 現物以外は必ず1以上の危険度とする。 */
const MIN_DANGER = 1;

const SUJI_DISTANCE = 3;
const MIN_RANK = 1;
const MAX_NUMBER_RANK = 9;
const MIDDLE_RANKS: readonly number[] = [4, 5, 6];

const isGenbutsu = (view: PlayerView, seat: number, tile: Tile): boolean =>
  River.contains(view.rivers[seat], tile);

const honorDanger = (info: TableInfo, tile: Tile): number => {
  const remaining = TableInfo.remaining(info, tile);
  if (remaining < QUIET_HONOR_REMAINING) {
    return SAFE_HONOR_DANGER;
  }
  return remaining === QUIET_HONOR_REMAINING
    ? QUIET_HONOR_DANGER
    : LIVE_HONOR_DANGER;
};

const hasSujiAt = (
  view: PlayerView,
  seat: number,
  tile: Tile,
  offset: number,
): boolean => {
  const rank = tile.rank + offset;
  if (rank < MIN_RANK || rank > MAX_NUMBER_RANK) {
    return false;
  }
  return isGenbutsu(view, seat, { suit: tile.suit, rank, red: false });
};

const sujiPercent = (
  view: PlayerView,
  seat: number,
  tile: Tile,
): number => {
  const lower = hasSujiAt(view, seat, tile, -SUJI_DISTANCE);
  const upper = hasSujiAt(view, seat, tile, SUJI_DISTANCE);
  if (lower && upper) {
    return BOTH_SUJI_PERCENT;
  }
  if (!lower && !upper) {
    return FULL_PERCENT;
  }
  return MIDDLE_RANKS.includes(tile.rank)
    ? SINGLE_SUJI_PERCENT
    : EDGE_SUJI_PERCENT;
};

const numberDanger = (
  view: PlayerView,
  seat: number,
  tile: Tile,
): number => {
  const base = NUMBER_DANGER[tile.rank - 1];
  const discounted = Math.floor(
    (base * sujiPercent(view, seat, tile)) / FULL_PERCENT,
  );
  return Math.max(MIN_DANGER, discounted);
};

const dangerAgainst = (
  view: PlayerView,
  info: TableInfo,
  seat: number,
  tile: Tile,
): number => {
  if (isGenbutsu(view, seat, tile)) {
    return GENBUTSU_DANGER;
  }
  return Tile.isHonor(tile)
    ? honorDanger(info, tile)
    : numberDanger(view, seat, tile);
};

export const Safety = {
  /**
   * リーチしている他家に対する危険度。0は全員に対する現物。
   * リーチしている他家がいなければ常に0。
   */
  danger(view: PlayerView, info: TableInfo, tile: Tile): number {
    return info.threats.reduce(
      (highest, seat) =>
        Math.max(highest, dangerAgainst(view, info, seat, tile)),
      GENBUTSU_DANGER,
    );
  },

  /** リーチしている他家全員に対して現物か(脅威がいなければ安全とみなす)。 */
  isSafe(view: PlayerView, info: TableInfo, tile: Tile): boolean {
    return Safety.danger(view, info, tile) === GENBUTSU_DANGER;
  },
} as const;
