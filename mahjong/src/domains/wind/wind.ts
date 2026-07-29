import { Tile } from "../tile/index.ts";

/** 風。東・南・西・北。 */
export type Wind = "ton" | "nan" | "sha" | "pei";

const ORDER: readonly Wind[] = ["ton", "nan", "sha", "pei"];

const SEAT_COUNT = 4;

export const Wind = {
  /** 東→南→西→北の順の一覧。 */
  all(): readonly Wind[] {
    return ORDER;
  },

  /** 風として妥当な文字列か。 */
  isWind(value: string): value is Wind {
    return ORDER.includes(value as Wind);
  },

  /** 東=0 南=1 西=2 北=3。 */
  toIndex(wind: Wind): number {
    return ORDER.indexOf(wind);
  },

  /** インデックス(0〜3、4以上は循環)から風を求める。 */
  fromIndex(index: number): Wind {
    const normalized = ((index % SEAT_COUNT) + SEAT_COUNT) % SEAT_COUNT;
    return ORDER[normalized];
  },

  /** 次の風(東→南→西→北→東)。 */
  next(wind: Wind): Wind {
    return Wind.fromIndex(Wind.toIndex(wind) + 1);
  },

  /** 対応する風牌。 */
  toTile(wind: Wind): Tile {
    return { suit: "honor", rank: Wind.toIndex(wind) + 1, red: false };
  },

  /** 風牌から風を求める。風牌でなければ null。 */
  fromTile(tile: Tile): Wind | null {
    return Tile.isWind(tile) ? Wind.fromIndex(tile.rank - 1) : null;
  },

  /** 親の席から見た、ある席の自風。 */
  ofSeat(seat: number, dealerSeat: number): Wind {
    return Wind.fromIndex(seat - dealerSeat);
  },
} as const;
