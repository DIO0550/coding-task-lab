export type TileSuit = "m" | "p" | "s" | "z";

export type Wind = "ton" | "nan" | "sha" | "pei";

/**
 * 牌。rank は数牌が 1〜9、字牌(z)は 1〜7(東南西北白發中)。
 * 赤5は rank 5 + red: true で表す。
 */
export type Tile = Readonly<{
  suit: TileSuit;
  rank: number;
  red: boolean;
}>;

const HONOR_NAMES = [
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
] as const;

type HonorName = (typeof HONOR_NAMES)[number];

const isHonorName = (text: string): text is HonorName =>
  (HONOR_NAMES as readonly string[]).includes(text);

const SUIT_OFFSET: Readonly<Record<TileSuit, number>> = {
  m: 0,
  p: 9,
  s: 18,
  z: 27,
};

const WIND_RANK: Readonly<Record<Wind, number>> = {
  ton: 1,
  nan: 2,
  sha: 3,
  pei: 4,
};

// 緑一色を構成する牌種 index(2s,3s,4s,6s,8s,發)
const GREEN_INDEXES: ReadonlyArray<number> = [19, 20, 21, 23, 25, 32];

export const Tile = {
  /** 牌表記("1m"〜"9m", "0m"(赤5), "ton" 等)をパースする。不正なら null */
  parse(text: string): Tile | null {
    if (isHonorName(text)) {
      return { suit: "z", rank: HONOR_NAMES.indexOf(text) + 1, red: false };
    }
    if (text.length !== 2) {
      return null;
    }
    const [digit, suit] = [text[0], text[1]];
    if (suit !== "m" && suit !== "p" && suit !== "s") {
      return null;
    }
    if (digit < "0" || digit > "9") {
      return null;
    }
    const value = Number(digit);
    if (value === 0) {
      return { suit, rank: 5, red: true };
    }
    return { suit, rank: value, red: false };
  },

  /** 牌表記文字列へ変換する */
  format(tile: Tile): string {
    if (tile.suit === "z") {
      return HONOR_NAMES[tile.rank - 1];
    }
    return `${tile.red ? 0 : tile.rank}${tile.suit}`;
  },

  /** 牌種 index(0〜33)。赤5は通常の5と同じ index */
  index(tile: Tile): number {
    return SUIT_OFFSET[tile.suit] + tile.rank - 1;
  },

  /** 牌種 index から牌を復元する(赤フラグなし) */
  fromIndex(index: number): Tile {
    if (index >= 27) {
      return { suit: "z", rank: index - 26, red: false };
    }
    if (index >= 18) {
      return { suit: "s", rank: index - 17, red: false };
    }
    if (index >= 9) {
      return { suit: "p", rank: index - 8, red: false };
    }
    return { suit: "m", rank: index + 1, red: false };
  },

  /** 牌種 index の表記文字列 */
  formatIndex(index: number): string {
    return Tile.format(Tile.fromIndex(index));
  },

  /** 赤を無視した同種判定 */
  equalsKind(a: Tile, b: Tile): boolean {
    return a.suit === b.suit && a.rank === b.rank;
  },

  isHonor(index: number): boolean {
    return index >= 27;
  },

  isTerminal(index: number): boolean {
    if (index >= 27) {
      return false;
    }
    const rank = (index % 9) + 1;
    return rank === 1 || rank === 9;
  },

  /** 么九牌(老頭牌+字牌) */
  isYaochuu(index: number): boolean {
    return Tile.isHonor(index) || Tile.isTerminal(index);
  },

  /** 中張牌(2〜8の数牌) */
  isSimple(index: number): boolean {
    return !Tile.isYaochuu(index);
  },

  /** 三元牌(白發中) */
  isDragon(index: number): boolean {
    return index >= 31 && index <= 33;
  },

  /** 風牌(東南西北) */
  isWindTile(index: number): boolean {
    return index >= 27 && index <= 30;
  },

  /** 緑一色の構成牌 */
  isGreen(index: number): boolean {
    return GREEN_INDEXES.includes(index);
  },

  /** 風(東南西北)に対応する牌種 index */
  windIndex(wind: Wind): number {
    return SUIT_OFFSET.z + WIND_RANK[wind] - 1;
  },

  /** 牌リストを牌種 index ごとの枚数配列(長さ34)へ変換する */
  toCounts(tiles: ReadonlyArray<Tile>): ReadonlyArray<number> {
    const counts = new Array<number>(34).fill(0);
    for (const tile of tiles) {
      counts[Tile.index(tile)] += 1;
    }
    return counts;
  },
} as const;
