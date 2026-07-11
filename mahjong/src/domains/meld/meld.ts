import { Tile } from "../tile/index.ts";

/** kan=明カン(加槓含む), ankan=暗槓 */
export type MeldType = "chi" | "pon" | "kan" | "ankan";

export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
}>;

const MELD_TYPES: readonly string[] = ["chi", "pon", "kan", "ankan"];

const TRIPLET_SIZE = 3;

const KAN_SIZE = 4;

const isMeldType = (value: unknown): value is MeldType =>
  typeof value === "string" && MELD_TYPES.includes(value);

const getProperty = (value: object, key: string): unknown =>
  (value as Record<string, unknown>)[key];

const parseTiles = (raw: unknown): readonly Tile[] | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  const tiles: Tile[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      return null;
    }
    const tile = Tile.parse(item);
    if (tile === null) {
      return null;
    }
    tiles.push(tile);
  }
  return tiles;
};

/** 昇順ソート済みの3枚が同一 suit の連続数牌か */
const isConsecutiveRun = (tiles: readonly Tile[]): boolean => {
  if (tiles.length !== TRIPLET_SIZE) {
    return false;
  }
  const [first, second, third] = tiles;
  if (first.suit === "z") {
    return false;
  }
  if (first.suit !== second.suit || second.suit !== third.suit) {
    return false;
  }
  return second.rank === first.rank + 1 && third.rank === second.rank + 1;
};

/** 全牌が同一牌(red は無視)か */
const isAllSameTile = (tiles: readonly Tile[]): boolean =>
  tiles.every((tile) => Tile.equals(tile, tiles[0]));

export const Meld = {
  /**
   * {type: string, tiles: string[]} 形式の生入力を検証して Meld を返す。
   * chi=連続3枚, pon=同3枚, kan/ankan=同4枚。不正は null。tiles は昇順に正規化する
   */
  parse(raw: unknown): Meld | null {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const type = getProperty(raw, "type");
    if (!isMeldType(type)) {
      return null;
    }
    const parsedTiles = parseTiles(getProperty(raw, "tiles"));
    if (parsedTiles === null) {
      return null;
    }
    const tiles = parsedTiles.toSorted(Tile.compare);
    if (type === "chi") {
      return isConsecutiveRun(tiles) ? { type, tiles } : null;
    }
    if (type === "pon") {
      return tiles.length === TRIPLET_SIZE && isAllSameTile(tiles)
        ? { type, tiles }
        : null;
    }
    return tiles.length === KAN_SIZE && isAllSameTile(tiles)
      ? { type, tiles }
      : null;
  },

  /** 暗槓のみ true(面前扱いの副露) */
  isConcealed(meld: Meld): boolean {
    return meld.type === "ankan";
  },

  /** カン(明カン・暗槓)か */
  isKan(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },

  /** 刻子系(ポン・カン・暗槓)か */
  isTriplet(meld: Meld): boolean {
    return meld.type !== "chi";
  },

  /** 順子(チー)か */
  isSequence(meld: Meld): boolean {
    return meld.type === "chi";
  },

  /** 面子の代表牌(順子は最小の牌、刻子系はその牌) */
  representative(meld: Meld): Tile {
    return meld.tiles[0];
  },
} as const;
