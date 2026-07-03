export type Suit = "m" | "p" | "s";

export type SuitedTile = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${Suit}`;

export type WindTile = "ton" | "nan" | "sha" | "pei";

export type DragonTile = "haku" | "hatsu" | "chun";

export type HonorTile = WindTile | DragonTile;

export type Tile = SuitedTile | HonorTile;

/** 牌種インデックス(0..33)。萬子0-8 / 筒子9-17 / 索子18-26 / 字牌27-33 */
export type TileIndex = number;

const SUITS: readonly Suit[] = ["m", "p", "s"];

const HONORS: readonly HonorTile[] = [
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
];

const WINDS: readonly WindTile[] = ["ton", "nan", "sha", "pei"];

const DRAGONS: readonly DragonTile[] = ["haku", "hatsu", "chun"];

const ALL_TILES: readonly Tile[] = [
  ...SUITS.flatMap((suit) =>
    Array.from({ length: 10 }, (_, n) => `${n}${suit}` as SuitedTile),
  ),
  ...HONORS,
];

const TILE_SET: ReadonlySet<string> = new Set(ALL_TILES);

export const TILE_KIND_COUNT = 34;

const isSuited = (tile: Tile): tile is SuitedTile =>
  tile.length === 2 && SUITS.includes(tile[1] as Suit);

export const Tile = {
  isTile(value: string): value is Tile {
    return TILE_SET.has(value);
  },

  parse(value: string): Tile | null {
    return Tile.isTile(value) ? value : null;
  },

  /** 赤5を通常の5に正規化する */
  normalize(tile: Tile): Tile {
    if (isSuited(tile) && tile[0] === "0") {
      return `5${tile[1] as Suit}`;
    }
    return tile;
  },

  isRed(tile: Tile): boolean {
    return isSuited(tile) && tile[0] === "0";
  },

  isHonor(tile: Tile): tile is HonorTile {
    return !isSuited(tile);
  },

  isWind(tile: Tile): tile is WindTile {
    return (WINDS as readonly string[]).includes(tile);
  },

  isDragon(tile: Tile): tile is DragonTile {
    return (DRAGONS as readonly string[]).includes(tile);
  },

  suitOf(tile: Tile): Suit | null {
    return isSuited(tile) ? (tile[1] as Suit) : null;
  },

  /** 数牌の数字(赤5は5)。字牌は null */
  numberOf(tile: Tile): number | null {
    if (!isSuited(tile)) {
      return null;
    }
    const n = Number(tile[0]);
    return n === 0 ? 5 : n;
  },

  isTerminal(tile: Tile): boolean {
    const n = Tile.numberOf(tile);
    return n === 1 || n === 9;
  },

  /** 么九牌(1・9・字牌) */
  isTerminalOrHonor(tile: Tile): boolean {
    return Tile.isHonor(tile) || Tile.isTerminal(tile);
  },

  isSimple(tile: Tile): boolean {
    return !Tile.isTerminalOrHonor(tile);
  },

  toIndex(tile: Tile): TileIndex {
    if (isSuited(tile)) {
      const suit = tile[1] as Suit;
      const n = Tile.numberOf(tile) as number;
      return SUITS.indexOf(suit) * 9 + (n - 1);
    }
    return 27 + HONORS.indexOf(tile);
  },

  fromIndex(index: TileIndex): Tile {
    if (index < 27) {
      const suit = SUITS[Math.floor(index / 9)];
      return `${(index % 9) + 1}${suit}` as SuitedTile;
    }
    return HONORS[index - 27];
  },

  indexIsHonor(index: TileIndex): boolean {
    return index >= 27;
  },

  indexIsWind(index: TileIndex): boolean {
    return index >= 27 && index <= 30;
  },

  indexIsDragon(index: TileIndex): boolean {
    return index >= 31;
  },

  indexIsTerminal(index: TileIndex): boolean {
    return index < 27 && (index % 9 === 0 || index % 9 === 8);
  },

  /** 么九牌(1・9・字牌)のインデックス判定 */
  indexIsTerminalOrHonor(index: TileIndex): boolean {
    return Tile.indexIsHonor(index) || Tile.indexIsTerminal(index);
  },

  indexIsSimple(index: TileIndex): boolean {
    return !Tile.indexIsTerminalOrHonor(index);
  },

  /** 数牌のインデックスの数字(1..9)。字牌は null */
  indexNumberOf(index: TileIndex): number | null {
    return index < 27 ? (index % 9) + 1 : null;
  },

  /** ドラ表示牌が示すドラ */
  indicatedDora(indicator: Tile): Tile {
    const index = Tile.toIndex(indicator);
    if (index < 27) {
      const suitBase = Math.floor(index / 9) * 9;
      return Tile.fromIndex(suitBase + ((index - suitBase + 1) % 9));
    }
    if (Tile.indexIsWind(index)) {
      return WINDS[(WINDS.indexOf(indicator as WindTile) + 1) % 4];
    }
    return DRAGONS[(DRAGONS.indexOf(indicator as DragonTile) + 1) % 3];
  },

  /** 親からの席順(0=東,1=南,2=西,3=北)に対応する風牌 */
  windForSeatOffset(offset: number): WindTile {
    return WINDS[offset % 4];
  },

  windOrder(wind: WindTile): number {
    return WINDS.indexOf(wind);
  },

  /** 表示・比較用のソートキー(赤5は5と5.5の間ではなく5の直前に置く) */
  sortKey(tile: Tile): number {
    const index = Tile.toIndex(tile);
    return index * 2 + (Tile.isRed(tile) ? 0 : 1);
  },

  compare(a: Tile, b: Tile): number {
    return Tile.sortKey(a) - Tile.sortKey(b);
  },

  sort(tiles: readonly Tile[]): readonly Tile[] {
    return [...tiles].sort(Tile.compare);
  },

  /** 牌配列を34種の枚数配列へ変換する(赤5は5として数える) */
  toCounts(tiles: readonly Tile[]): readonly number[] {
    const counts = Array.from({ length: TILE_KIND_COUNT }, () => 0);
    for (const tile of tiles) {
      counts[Tile.toIndex(tile)] += 1;
    }
    return counts;
  },
} as const;
