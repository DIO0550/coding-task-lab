/**
 * 牌ドメイン。
 * 字牌は suit="z"、rank は ton=1, nan=2, sha=3, pei=4, haku=5, hatsu=6, chun=7。
 * 数牌の rank は 1..9。赤5は rank=5, red=true(表記は "0m"/"0p"/"0s")。
 */
export type Suit = "m" | "p" | "s" | "z";

export type Tile = Readonly<{
  suit: Suit;
  rank: number;
  red: boolean;
}>;

/** 字牌の表記。配列の添字+1 が rank に対応する */
const HONOR_NOTATIONS: readonly string[] = [
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
];

const NUMBER_NOTATION_PATTERN = /^([0-9])([mps])$/;

const SUIT_ORDER: Readonly<Record<Suit, number>> = { m: 0, p: 1, s: 2, z: 3 };

const NUMBER_SUITS: readonly ("m" | "p" | "s")[] = ["m", "p", "s"];

const NUMBER_RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const HONOR_RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

const WIND_RANK_MAX = 4;

const DRAGON_RANK_MIN = 5;

const create = (suit: Suit, rank: number, red: boolean): Tile => ({
  suit,
  rank,
  red,
});

/** 34種(赤なし)の全牌を正準順(m→p→s→z、rank昇順)で保持する */
const ALL_TILES: readonly Tile[] = [
  ...NUMBER_SUITS.flatMap((suit) =>
    NUMBER_RANKS.map((rank) => create(suit, rank, false)),
  ),
  ...HONOR_RANKS.map((rank) => create("z", rank, false)),
];

export const Tile = {
  /** 牌表記("5m"/"0p"/"ton" 等)を Tile に変換する。不正表記は null */
  parse(notation: string): Tile | null {
    const honorIndex = HONOR_NOTATIONS.indexOf(notation);
    if (honorIndex >= 0) {
      return create("z", honorIndex + 1, false);
    }
    const matched = NUMBER_NOTATION_PATTERN.exec(notation);
    if (matched === null) {
      return null;
    }
    const digit = Number(matched[1]);
    const suit = matched[2];
    if (suit !== "m" && suit !== "p" && suit !== "s") {
      return null;
    }
    if (digit === 0) {
      return create(suit, 5, true);
    }
    return create(suit, digit, false);
  },

  /** Tile を牌表記に戻す。赤5は "0m"/"0p"/"0s"、字牌は "ton" 等 */
  toNotation(tile: Tile): string {
    if (tile.suit === "z") {
      return HONOR_NOTATIONS[tile.rank - 1];
    }
    if (tile.red) {
      return `0${tile.suit}`;
    }
    return `${tile.rank}${tile.suit}`;
  },

  /** red を無視した正準キー(例 "m5", "z1")。グルーピング用 */
  key(tile: Tile): string {
    return `${tile.suit}${tile.rank}`;
  },

  /** 字牌か */
  isHonor(tile: Tile): boolean {
    return tile.suit === "z";
  },

  /** 数牌の1か9か */
  isTerminal(tile: Tile): boolean {
    return tile.suit !== "z" && (tile.rank === 1 || tile.rank === 9);
  },

  /** 幺九牌(数牌の1/9 または字牌)か */
  isYaochu(tile: Tile): boolean {
    return Tile.isHonor(tile) || Tile.isTerminal(tile);
  },

  /** 中張牌(数牌の2..8)か */
  isSimple(tile: Tile): boolean {
    return tile.suit !== "z" && tile.rank >= 2 && tile.rank <= 8;
  },

  /** 風牌(東南西北)か */
  isWind(tile: Tile): boolean {
    return tile.suit === "z" && tile.rank >= 1 && tile.rank <= WIND_RANK_MAX;
  },

  /** 三元牌(白發中)か */
  isDragon(tile: Tile): boolean {
    return tile.suit === "z" && tile.rank >= DRAGON_RANK_MIN && tile.rank <= 7;
  },

  /** 赤牌か */
  isRed(tile: Tile): boolean {
    return tile.red;
  },

  /** suit と rank が一致するか(red は無視) */
  equals(a: Tile, b: Tile): boolean {
    return a.suit === b.suit && a.rank === b.rank;
  },

  /** red も含めて完全一致するか */
  equalsExact(a: Tile, b: Tile): boolean {
    return Tile.equals(a, b) && a.red === b.red;
  },

  /** 並べ替え順: m<p<s<z、同 suit は rank 昇順。赤5は rank5 扱い */
  compare(a: Tile, b: Tile): number {
    return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.rank - b.rank;
  },

  /**
   * 次の牌(ドラ表示牌→ドラの規則)。数牌は 9→1、風牌は ton→nan→sha→pei→ton、
   * 三元牌は haku→hatsu→chun→haku。red は付けない
   */
  next(tile: Tile): Tile {
    if (tile.suit !== "z") {
      return create(tile.suit, tile.rank === 9 ? 1 : tile.rank + 1, false);
    }
    if (tile.rank <= WIND_RANK_MAX) {
      return create("z", tile.rank === WIND_RANK_MAX ? 1 : tile.rank + 1, false);
    }
    return create("z", tile.rank === 7 ? DRAGON_RANK_MIN : tile.rank + 1, false);
  },

  /** ドラ表示牌からドラを求める(= next) */
  doraFromIndicator(indicator: Tile): Tile {
    return Tile.next(indicator);
  },

  /** 34種(赤なし)を正準順で返す */
  all(): readonly Tile[] {
    return ALL_TILES;
  },
} as const;
