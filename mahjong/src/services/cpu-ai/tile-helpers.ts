import type { GameView, SeatIndex } from "../../domains/game/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileType } from "../../domains/tile/index.ts";

const KIND_COUNT = 34;

/** tiles から target と同種(赤区別なし)の牌を1枚だけ取り除く。見つからなければそのまま返す。 */
export const removeOneMatching = (tiles: readonly TileType[], target: TileType): readonly TileType[] => {
  const index = tiles.findIndex((t) => Tile.equals(t, target));
  if (index === -1) {
    return tiles;
  }
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

/** tiles から target と同種(赤区別なし)の牌を count 枚取り除く。不足していれば null。 */
export const removeNMatching = (
  tiles: readonly TileType[],
  target: TileType,
  count: number,
): readonly TileType[] | null => {
  let remaining = tiles;
  for (let i = 0; i < count; i += 1) {
    const before = remaining.length;
    remaining = removeOneMatching(remaining, target);
    if (remaining.length === before) {
      return null;
    }
  }
  return remaining;
};

/** 赤区別なしで一致する枚数を数える。 */
export const countMatching = (tiles: readonly TileType[], target: TileType): number =>
  tiles.filter((t) => Tile.equals(t, target)).length;

/** 34種それぞれの枚数配列を作る。 */
export const buildCounts34 = (tiles: readonly TileType[]): readonly number[] => {
  const counts = new Array(KIND_COUNT).fill(0) as number[];
  for (const tile of tiles) {
    counts[Tile.toIndex34(tile)] += 1;
  }
  return counts;
};

/** 種類(赤区別なし)ごとに重複を除いた牌一覧。 */
export const distinctKinds = (tiles: readonly TileType[]): readonly TileType[] => {
  const seen = new Set<number>();
  const result: TileType[] = [];
  for (const tile of tiles) {
    const index = Tile.toIndex34(tile);
    if (!seen.has(index)) {
      seen.add(index);
      result.push(tile);
    }
  }
  return result;
};

/**
 * 「公開情報として見えている」牌の34種別枚数(自手牌・自ツモ・全員の副露・全員の河・ドラ表示牌)。
 * 山の中身・他家の手牌(見えていない牌)は含めない。
 * 受け入れ枚数計算や危険牌評価の「残り枚数」の基準として使う。
 */
export const computeVisibleCounts = (view: GameView): readonly number[] => {
  const counts = new Array(KIND_COUNT).fill(0) as number[];
  const add = (tile: TileType): void => {
    counts[Tile.toIndex34(tile)] += 1;
  };
  view.hand.forEach(add);
  if (view.drawnTile !== null) {
    add(view.drawnTile);
  }
  for (const player of view.players) {
    player.melds.forEach((meld) => meld.tiles.forEach(add));
    player.river.forEach((riverTile) => add(riverTile.tile));
  }
  view.doraIndicators.forEach(add);
  return counts;
};

/** dealerSeat を "ton" とした場合の seat の自風(services/game-engine と同じ規則)。 */
const WIND_ORDER = ["ton", "nan", "sha", "pei"] as const;
export const seatWindOf = (dealerSeat: SeatIndex, seat: SeatIndex): (typeof WIND_ORDER)[number] => {
  const distance = (seat - dealerSeat + 4) % 4;
  return WIND_ORDER[distance] as (typeof WIND_ORDER)[number];
};

export const kamichaOf = (seat: SeatIndex): SeatIndex => (((seat + 3) % 4) as SeatIndex);
export const shimochaOf = (seat: SeatIndex): SeatIndex => (((seat + 1) % 4) as SeatIndex);
export const toimenOf = (seat: SeatIndex): SeatIndex => (((seat + 2) % 4) as SeatIndex);

/** 自席以外の3席を、下家→対面→上家の順で返す(鳴き対象牌の推定探索順に使う)。 */
export const othersInClaimSearchOrder = (seat: SeatIndex): readonly SeatIndex[] => [
  shimochaOf(seat),
  toimenOf(seat),
  kamichaOf(seat),
];
