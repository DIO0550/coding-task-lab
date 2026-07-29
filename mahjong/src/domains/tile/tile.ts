/** 牌の種類。萬子・筒子・索子・字牌。 */
export type TileSuit = "man" | "pin" | "sou" | "honor";

/**
 * 牌。
 * 数牌の rank は 1〜9、字牌の rank は 東=1 南=2 西=3 北=4 白=5 發=6 中=7。
 * 赤5は rank=5 かつ red=true で表す(牌としての種類は通常の5と同じ)。
 */
export type Tile = Readonly<{
  suit: TileSuit;
  rank: number;
  red: boolean;
}>;

const HONOR_CODES = [
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
] as const;

/** 字牌の牌表記。 */
export type HonorCode = (typeof HONOR_CODES)[number];

const NUMBER_SUITS = {
  m: "man",
  p: "pin",
  s: "sou",
} as const satisfies Record<string, TileSuit>;

const SUIT_CODES = {
  man: "m",
  pin: "p",
  sou: "s",
} as const;

/** 牌種の総数(萬子9 + 筒子9 + 索子9 + 字牌7)。 */
export const TILE_KIND_COUNT = 34;

const SUIT_OFFSET = {
  man: 0,
  pin: 9,
  sou: 18,
  honor: 27,
} as const satisfies Record<TileSuit, number>;

const SUIT_BY_OFFSET: readonly TileSuit[] = ["man", "pin", "sou"];

const NUMBER_CODE_PATTERN = /^([0-9])([mps])$/;

const isNumberSuitCode = (code: string): code is keyof typeof NUMBER_SUITS =>
  Object.hasOwn(NUMBER_SUITS, code);

const rankLimit = (suit: TileSuit): number => (suit === "honor" ? 7 : 9);

/** 緑一色を構成できる索子の数(發は Tile.isGreen で別途判定する)。 */
const GREEN_SOU_RANKS: readonly number[] = [2, 3, 4, 6, 8];

export const Tile = {
  /** `1m` `0p` `ton` などの牌表記から牌を生成する。表記が不正なら null。 */
  fromCode(code: string): Tile | null {
    const honorIndex = HONOR_CODES.indexOf(code as HonorCode);
    if (honorIndex >= 0) {
      return { suit: "honor", rank: honorIndex + 1, red: false };
    }

    const matched = NUMBER_CODE_PATTERN.exec(code);
    if (matched === null) {
      return null;
    }

    const suitCode = matched[2];
    if (!isNumberSuitCode(suitCode)) {
      return null;
    }

    const digit = Number(matched[1]);
    const suit = NUMBER_SUITS[suitCode];
    return digit === 0
      ? { suit, rank: 5, red: true }
      : { suit, rank: digit, red: false };
  },

  /** 牌表記の配列をまとめて変換する。1つでも不正なら null。 */
  fromCodes(codes: readonly string[]): readonly Tile[] | null {
    const tiles = codes.map((code) => Tile.fromCode(code));
    return tiles.every((tile): tile is Tile => tile !== null) ? tiles : null;
  },

  /** 牌を牌表記へ変換する。赤5は `0m` 形式。 */
  toCode(tile: Tile): string {
    if (tile.suit === "honor") {
      return HONOR_CODES[tile.rank - 1];
    }
    const digit = tile.red ? 0 : tile.rank;
    return `${digit}${SUIT_CODES[tile.suit]}`;
  },

  /** 牌種インデックス(0〜33)。赤5は通常の5と同じインデックスになる。 */
  toIndex(tile: Tile): number {
    return SUIT_OFFSET[tile.suit] + tile.rank - 1;
  },

  /** 牌種インデックスから牌を生成する(赤ではない牌)。 */
  fromIndex(index: number): Tile {
    if (index >= SUIT_OFFSET.honor) {
      return { suit: "honor", rank: index - SUIT_OFFSET.honor + 1, red: false };
    }
    const suit = SUIT_BY_OFFSET[Math.floor(index / 9)];
    return { suit, rank: (index % 9) + 1, red: false };
  },

  /** 牌として成立する範囲か。 */
  isValid(tile: Tile): boolean {
    return (
      Number.isInteger(tile.rank) &&
      tile.rank >= 1 &&
      tile.rank <= rankLimit(tile.suit) &&
      (!tile.red || (tile.suit !== "honor" && tile.rank === 5))
    );
  },

  /** 赤ドラの違いを無視して同じ牌種か判定する。 */
  isSameKind(left: Tile, right: Tile): boolean {
    return left.suit === right.suit && left.rank === right.rank;
  },

  /** 字牌か。 */
  isHonor(tile: Tile): boolean {
    return tile.suit === "honor";
  },

  /** 風牌(東南西北)か。 */
  isWind(tile: Tile): boolean {
    return tile.suit === "honor" && tile.rank <= 4;
  },

  /** 三元牌(白發中)か。 */
  isDragon(tile: Tile): boolean {
    return tile.suit === "honor" && tile.rank >= 5;
  },

  /** 老頭牌(1・9)か。 */
  isTerminal(tile: Tile): boolean {
    return tile.suit !== "honor" && (tile.rank === 1 || tile.rank === 9);
  },

  /** 么九牌(1・9・字牌)か。 */
  isOrphan(tile: Tile): boolean {
    return Tile.isHonor(tile) || Tile.isTerminal(tile);
  },

  /** 中張牌(2〜8)か。 */
  isSimple(tile: Tile): boolean {
    return !Tile.isOrphan(tile);
  },

  /** 緑一色を構成できる牌(索子の2/3/4/6/8 と發)か。 */
  isGreen(tile: Tile): boolean {
    if (tile.suit === "honor") {
      return tile.rank === 6;
    }
    return tile.suit === "sou" && GREEN_SOU_RANKS.includes(tile.rank);
  },

  /** ドラ表示牌からドラを求める。 */
  doraFromIndicator(indicator: Tile): Tile {
    if (indicator.suit !== "honor") {
      const rank = indicator.rank === 9 ? 1 : indicator.rank + 1;
      return { suit: indicator.suit, rank, red: false };
    }
    if (indicator.rank <= 4) {
      const rank = indicator.rank === 4 ? 1 : indicator.rank + 1;
      return { suit: "honor", rank, red: false };
    }
    const rank = indicator.rank === 7 ? 5 : indicator.rank + 1;
    return { suit: "honor", rank, red: false };
  },

  /** 表示・比較用の並び順(萬子→筒子→索子→字牌、同種は数順)。 */
  compare(left: Tile, right: Tile): number {
    const suitDiff = SUIT_OFFSET[left.suit] - SUIT_OFFSET[right.suit];
    if (suitDiff !== 0) {
      return suitDiff;
    }
    const rankDiff = left.rank - right.rank;
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return Number(left.red) - Number(right.red);
  },

  /** 牌を並び替えた新しい配列を返す。 */
  sort(tiles: readonly Tile[]): readonly Tile[] {
    return [...tiles].sort(Tile.compare);
  },

  /** 34種すべての牌(赤なし)。 */
  allKinds(): readonly Tile[] {
    return Array.from({ length: TILE_KIND_COUNT }, (_, index) =>
      Tile.fromIndex(index),
    );
  },
} as const;
