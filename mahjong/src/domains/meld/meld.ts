import type { SeatIndex } from "@/src/domains/seat";
import { Tile } from "@/src/domains/tile";

/**
 * 副露面子。`kan` は明槓(大明槓・加槓)、`ankan` は暗槓。
 * `calledTile` / `from` は対局中の表示・判定用で、点数計算の入力契約では省略可。
 */
export type MeldType = "chi" | "pon" | "kan" | "ankan";

export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
  /** 他家から鳴いた牌(暗槓では undefined) */
  calledTile?: Tile;
  /** 鳴いた相手の席(暗槓では undefined) */
  from?: SeatIndex;
}>;

const MELD_TYPES: readonly MeldType[] = ["chi", "pon", "kan", "ankan"];

const isSequence = (tiles: readonly Tile[]): boolean => {
  if (tiles.length !== 3) return false;
  const [a, b, c] = Tile.sort(tiles);
  if (Tile.isHonor(a) || !Tile.isSameSuit(a, b) || !Tile.isSameSuit(a, c)) return false;
  return Tile.rank(b) === Tile.rank(a) + 1 && Tile.rank(c) === Tile.rank(a) + 2;
};

const isAllSame = (tiles: readonly Tile[], length: number): boolean =>
  tiles.length === length && tiles.every((tile) => Tile.equals(tile, tiles[0]));

const isValidShape = (type: MeldType, tiles: readonly Tile[]): boolean => {
  switch (type) {
    case "chi":
      return isSequence(tiles);
    case "pon":
      return isAllSame(tiles, 3);
    case "kan":
    case "ankan":
      return isAllSame(tiles, 4);
  }
};

export const Meld = {
  /** 形が正しい場合のみ副露を生成する */
  create(
    type: MeldType,
    tiles: readonly Tile[],
    options: { calledTile?: Tile; from?: SeatIndex } = {},
  ): Meld | undefined {
    if (!isValidShape(type, tiles)) return undefined;
    return { type, tiles: Tile.sort(tiles), ...options };
  },

  /** JSON 入力(`{ type, tiles }`)から副露を解釈する */
  parse(value: unknown): Meld | undefined {
    if (typeof value !== "object" || value === null) return undefined;
    const { type, tiles } = value as { type?: unknown; tiles?: unknown };
    const meldType = MELD_TYPES.find((candidate) => candidate === type);
    const parsedTiles = Tile.parseAll(tiles);
    if (meldType === undefined || parsedTiles === undefined) return undefined;
    return Meld.create(meldType, parsedTiles);
  },

  parseAll(value: unknown): readonly Meld[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const melds = value.map((item) => Meld.parse(item));
    return melds.every((meld): meld is Meld => meld !== undefined) ? melds : undefined;
  },

  /** 門前を崩す副露かどうか(暗槓は門前を保つ) */
  isOpen(meld: Meld): boolean {
    return meld.type !== "ankan";
  },

  isKan(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },

  isSequence(meld: Meld): boolean {
    return meld.type === "chi";
  },

  /** 刻子系(ポン・明槓・暗槓) */
  isTriplet(meld: Meld): boolean {
    return meld.type !== "chi";
  },

  /** 面子を代表する牌(刻子系はその牌、順子は最小の牌)。赤5は5に揃える */
  representative(meld: Meld): Tile {
    return Tile.normalize(Tile.sort(meld.tiles)[0]);
  },

  contains(meld: Meld, tile: Tile): boolean {
    return meld.tiles.some((candidate) => Tile.equals(candidate, tile));
  },

  /** ポンを加槓へ変換する */
  addKan(meld: Meld, tile: Tile): Meld | undefined {
    if (meld.type !== "pon" || !Tile.equals(tile, meld.tiles[0])) return undefined;
    return { ...meld, type: "kan", tiles: Tile.sort([...meld.tiles, tile]) };
  },
} as const;
