export type TileSuit = "m" | "p" | "s" | "z";

/**
 * 牌。字牌は suit "z" + rank 1〜7(東南西北白發中)。赤5は rank 5 + red。
 */
export type Tile = Readonly<{
  suit: TileSuit;
  rank: number;
  red: boolean;
}>;

/** 牌種インデックス(0〜33)。萬0〜8 / 筒9〜17 / 索18〜26 / 字27〜33 */
export type TileKind = number;

const HONOR_NAMES = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] as const;

const SUIT_OFFSET: Readonly<Record<TileSuit, number>> = {
  m: 0,
  p: 9,
  s: 18,
  z: 27,
};

const NUMBER_TILE_PATTERN = /^([0-9])([mps])$/;

const GREEN_KINDS: ReadonlySet<TileKind> = new Set([
  SUIT_OFFSET.s + 1, // 2s
  SUIT_OFFSET.s + 2, // 3s
  SUIT_OFFSET.s + 3, // 4s
  SUIT_OFFSET.s + 5, // 6s
  SUIT_OFFSET.s + 7, // 8s
  SUIT_OFFSET.z + 5, // 發
]);

export const Tile = {
  parse(text: string): Tile | null {
    const honorRank = HONOR_NAMES.indexOf(text as (typeof HONOR_NAMES)[number]);
    if (honorRank >= 0) {
      return { suit: "z", rank: honorRank + 1, red: false };
    }
    const match = NUMBER_TILE_PATTERN.exec(text);
    if (match === null) {
      return null;
    }
    const digit = Number(match[1]);
    const suit = match[2] as TileSuit;
    if (digit === 0) {
      return { suit, rank: 5, red: true };
    }
    return { suit, rank: digit, red: false };
  },

  format(tile: Tile): string {
    if (tile.suit === "z") {
      return HONOR_NAMES[tile.rank - 1];
    }
    return `${tile.red ? 0 : tile.rank}${tile.suit}`;
  },

  kindIndex(tile: Tile): TileKind {
    return SUIT_OFFSET[tile.suit] + tile.rank - 1;
  },

  fromKindIndex(kind: TileKind): Tile {
    if (kind >= SUIT_OFFSET.z) {
      return { suit: "z", rank: kind - SUIT_OFFSET.z + 1, red: false };
    }
    if (kind >= SUIT_OFFSET.s) {
      return { suit: "s", rank: kind - SUIT_OFFSET.s + 1, red: false };
    }
    if (kind >= SUIT_OFFSET.p) {
      return { suit: "p", rank: kind - SUIT_OFFSET.p + 1, red: false };
    }
    return { suit: "m", rank: kind + 1, red: false };
  },

  suitOfKind(kind: TileKind): TileSuit {
    return Tile.fromKindIndex(kind).suit;
  },

  rankOfKind(kind: TileKind): number {
    return Tile.fromKindIndex(kind).rank;
  },

  equalsKind(a: Tile, b: Tile): boolean {
    return Tile.kindIndex(a) === Tile.kindIndex(b);
  },

  isHonor(tile: Tile): boolean {
    return tile.suit === "z";
  },

  isTerminal(tile: Tile): boolean {
    return tile.suit !== "z" && (tile.rank === 1 || tile.rank === 9);
  },

  /** 么九牌(字牌・老頭牌) */
  isYaochuu(tile: Tile): boolean {
    return Tile.isHonor(tile) || Tile.isTerminal(tile);
  },

  isSimple(tile: Tile): boolean {
    return !Tile.isYaochuu(tile);
  },

  isDragon(tile: Tile): boolean {
    return tile.suit === "z" && tile.rank >= 5;
  },

  isWind(tile: Tile): boolean {
    return tile.suit === "z" && tile.rank <= 4;
  },

  /** 緑一色を構成できる牌(索子23468・發) */
  isGreen(tile: Tile): boolean {
    return GREEN_KINDS.has(Tile.kindIndex(tile));
  },

  isYaochuuKind(kind: TileKind): boolean {
    return Tile.isYaochuu(Tile.fromKindIndex(kind));
  },

  isHonorKind(kind: TileKind): boolean {
    return kind >= SUIT_OFFSET.z;
  },

  /** 34種の枚数配列を作る */
  countsOf(tiles: readonly Tile[]): readonly number[] {
    const counts = new Array<number>(34).fill(0);
    for (const tile of tiles) {
      counts[Tile.kindIndex(tile)] += 1;
    }
    return counts;
  },

  yaochuuKinds(): readonly TileKind[] {
    return YAOCHUU_KINDS;
  },
} as const;

const YAOCHUU_KINDS: readonly TileKind[] = Array.from({ length: 34 }, (_, kind) => kind).filter(
  (kind) => Tile.isYaochuuKind(kind),
);
