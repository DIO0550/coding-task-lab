import { Tile } from "../tile/index.ts";

export type MeldType = "chi" | "pon" | "kan" | "ankan";

/** 副露(暗槓を含む) */
export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
}>;

const isRun = (tiles: readonly Tile[]): boolean => {
  if (tiles.length !== 3) {
    return false;
  }
  const suit = tiles[0].suit;
  if (suit === "z" || tiles.some((tile) => tile.suit !== suit)) {
    return false;
  }
  const ranks = tiles.map((tile) => tile.rank).sort((a, b) => a - b);
  return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[0] + 2;
};

const isSameKind = (tiles: readonly Tile[], length: number): boolean =>
  tiles.length === length &&
  tiles.every((tile) => Tile.kindIndex(tile) === Tile.kindIndex(tiles[0]));

export const Meld = {
  /** 牌構成を検証して副露を生成する。不正な構成は null */
  create(type: MeldType, tiles: readonly Tile[]): Meld | null {
    if (type === "chi") {
      return isRun(tiles) ? { type, tiles } : null;
    }
    if (type === "pon") {
      return isSameKind(tiles, 3) ? { type, tiles } : null;
    }
    return isSameKind(tiles, 4) ? { type, tiles } : null;
  },

  /** 門前を崩す副露か(暗槓は門前を維持する) */
  isOpen(meld: Meld): boolean {
    return meld.type !== "ankan";
  },

  isKan(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },
} as const;
