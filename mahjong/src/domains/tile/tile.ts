import type { Wind } from "@/src/domains/wind";

/**
 * 牌。表記は `1m`〜`9m` / `1p`〜`9p` / `1s`〜`9s` / 字牌7種、赤5は `0m` / `0p` / `0s`。
 * 種類(赤を通常牌と同一視した34種)は 0〜33 の添字で扱う:
 *   萬子 0-8, 筒子 9-17, 索子 18-26, 東南西北 27-30, 白發中 31-33
 */
export type Suit = "m" | "p" | "s";
export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SuitedTile = `${Digit}${Suit}`;
export type HonorTile = "ton" | "nan" | "sha" | "pei" | "haku" | "hatsu" | "chun";
export type Tile = SuitedTile | HonorTile;

const SUITS: readonly Suit[] = ["m", "p", "s"];
const HONORS: readonly HonorTile[] = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"];
const WINDS: readonly HonorTile[] = ["ton", "nan", "sha", "pei"];
const DRAGONS: readonly HonorTile[] = ["haku", "hatsu", "chun"];
const GREEN: readonly Tile[] = ["2s", "3s", "4s", "6s", "8s", "hatsu"];

const KINDS: readonly Tile[] = [
  ...SUITS.flatMap((suit) =>
    Array.from({ length: 9 }, (_, i) => `${i + 1}${suit}` as SuitedTile),
  ),
  ...HONORS,
];

const TILE_PATTERN = /^[0-9][mps]$/;

const isHonorTile = (value: string): value is HonorTile =>
  (HONORS as readonly string[]).includes(value);

export const Tile = {
  /** 34種の牌(赤なし)を添字順に返す */
  kinds(): readonly Tile[] {
    return KINDS;
  },

  /** 136枚の牌セット。赤ドラありなら各色の5を1枚ずつ赤5に置き換える */
  fullSet(akaDora: boolean): readonly Tile[] {
    return KINDS.flatMap((tile) =>
      Array.from({ length: 4 }, (_, copy) =>
        akaDora && copy === 0 && Tile.rank(tile) === 5 && !Tile.isHonor(tile)
          ? (`0${Tile.suit(tile)}` as Tile)
          : tile,
      ),
    );
  },

  isTile(value: unknown): value is Tile {
    return typeof value === "string" && (TILE_PATTERN.test(value) || isHonorTile(value));
  },

  parse(value: unknown): Tile | undefined {
    return Tile.isTile(value) ? value : undefined;
  },

  parseAll(value: unknown): readonly Tile[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const tiles = value.map((item) => Tile.parse(item));
    return tiles.every((tile): tile is Tile => tile !== undefined) ? tiles : undefined;
  },

  isRed(tile: Tile): boolean {
    return tile.startsWith("0");
  },

  /** 赤5を通常の5に揃える */
  normalize(tile: Tile): Tile {
    return Tile.isRed(tile) ? (`5${tile.slice(1)}` as Tile) : tile;
  },

  /** 34種の添字(赤5は5と同じ添字) */
  toIndex(tile: Tile): number {
    return KINDS.indexOf(Tile.normalize(tile));
  },

  fromIndex(index: number): Tile {
    return KINDS[index];
  },

  suit(tile: Tile): Suit | "z" {
    return isHonorTile(tile) ? "z" : (tile[1] as Suit);
  },

  /** 数牌は 1〜9(赤5は5)、字牌は東=1〜中=7 */
  rank(tile: Tile): number {
    if (isHonorTile(tile)) return HONORS.indexOf(tile) + 1;
    const digit = Number(tile[0]);
    return digit === 0 ? 5 : digit;
  },

  isHonor(tile: Tile): boolean {
    return isHonorTile(tile);
  },

  isWind(tile: Tile): boolean {
    return (WINDS as readonly string[]).includes(tile);
  },

  isDragon(tile: Tile): boolean {
    return (DRAGONS as readonly string[]).includes(tile);
  },

  isTerminal(tile: Tile): boolean {
    if (isHonorTile(tile)) return false;
    const rank = Tile.rank(tile);
    return rank === 1 || rank === 9;
  },

  /** 么九牌(一九字牌) */
  isYaochu(tile: Tile): boolean {
    return Tile.isHonor(tile) || Tile.isTerminal(tile);
  },

  /** 中張牌(2〜8の数牌) */
  isSimple(tile: Tile): boolean {
    return !Tile.isYaochu(tile);
  },

  /** 緑一色の構成牌 */
  isGreen(tile: Tile): boolean {
    return GREEN.includes(Tile.normalize(tile));
  },

  /** 赤5を同一視した等価判定 */
  equals(a: Tile, b: Tile): boolean {
    return Tile.normalize(a) === Tile.normalize(b);
  },

  /** ドラ表示牌から実際のドラを求める(9→1, 北→東, 中→白) */
  next(tile: Tile): Tile {
    if (Tile.isWind(tile)) return WINDS[(WINDS.indexOf(tile as HonorTile) + 1) % 4];
    if (Tile.isDragon(tile)) return DRAGONS[(DRAGONS.indexOf(tile as HonorTile) + 1) % 3];
    const rank = Tile.rank(tile);
    return `${rank === 9 ? 1 : rank + 1}${Tile.suit(tile)}` as Tile;
  },

  ofWind(wind: Wind): Tile {
    return wind;
  },

  toWind(tile: Tile): Wind | undefined {
    return Tile.isWind(tile) ? (tile as Wind) : undefined;
  },

  /** 添字順、同種なら赤5を先に並べる比較関数 */
  compare(a: Tile, b: Tile): number {
    const byIndex = Tile.toIndex(a) - Tile.toIndex(b);
    if (byIndex !== 0) return byIndex;
    return Number(Tile.isRed(b)) - Number(Tile.isRed(a));
  },

  sort(tiles: readonly Tile[]): readonly Tile[] {
    return [...tiles].sort(Tile.compare);
  },

  /** 34種それぞれの枚数(赤5は5として数える) */
  counts(tiles: readonly Tile[]): readonly number[] {
    const counts = Array.from({ length: 34 }, () => 0);
    return tiles.reduce<number[]>((acc, tile) => {
      const index = Tile.toIndex(tile);
      return acc.map((count, i) => (i === index ? count + 1 : count));
    }, counts);
  },

  /** 枚数配列から牌の配列へ戻す(赤5情報は失われる) */
  fromCounts(counts: readonly number[]): readonly Tile[] {
    return counts.flatMap((count, index) =>
      Array.from({ length: count }, () => KINDS[index]),
    );
  },

  /** 同種の牌の枚数(赤5同一視) */
  countOf(tiles: readonly Tile[], tile: Tile): number {
    return tiles.filter((candidate) => Tile.equals(candidate, tile)).length;
  },

  /** 指定牌を1枚取り除いた配列。赤5と通常5は同一視し、見つからなければ元の配列を返す */
  removeOne(tiles: readonly Tile[], tile: Tile): readonly Tile[] {
    const exact = tiles.indexOf(tile);
    const index = exact >= 0 ? exact : tiles.findIndex((candidate) => Tile.equals(candidate, tile));
    if (index < 0) return tiles;
    return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
  },

  /** 同じ色(m/p/s)の数牌かどうか */
  isSameSuit(a: Tile, b: Tile): boolean {
    return !Tile.isHonor(a) && Tile.suit(a) === Tile.suit(b);
  },
} as const;
