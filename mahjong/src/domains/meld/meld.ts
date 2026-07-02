import { Tile } from "../tile/index.ts";

export type MeldType = "chi" | "pon" | "kan" | "ankan";

/** 副露(チー・ポン・明槓)および暗槓 */
export type Meld = Readonly<{
  type: MeldType;
  tiles: ReadonlyArray<Tile>;
}>;

const isChiShape = (tiles: ReadonlyArray<Tile>): boolean => {
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

const isSameKind = (tiles: ReadonlyArray<Tile>, size: number): boolean =>
  tiles.length === size &&
  tiles.every((tile) => Tile.equalsKind(tile, tiles[0]));

export const Meld = {
  /** 種別と牌構成の整合を検証して生成する。不正なら null */
  create(type: MeldType, tiles: ReadonlyArray<Tile>): Meld | null {
    if (type === "chi") {
      return isChiShape(tiles) ? { type, tiles } : null;
    }
    if (type === "pon") {
      return isSameKind(tiles, 3) ? { type, tiles } : null;
    }
    return isSameKind(tiles, 4) ? { type, tiles } : null;
  },

  /**
   * 種別と基準牌から副露を組み立てる(チーは最小牌が基準)。不正なら null。
   * 基準牌が赤5の場合は赤1枚を含む構成になる。
   */
  fromBase(type: MeldType, base: Tile): Meld | null {
    if (type === "chi") {
      if (base.suit === "z" || base.rank > 7) {
        return null;
      }
      return Meld.create(type, [
        base,
        { suit: base.suit, rank: base.rank + 1, red: false },
        { suit: base.suit, rank: base.rank + 2, red: false },
      ]);
    }
    const plain: Tile = { suit: base.suit, rank: base.rank, red: false };
    const count = type === "pon" ? 2 : 3;
    return Meld.create(type, [
      base,
      ...Array.from({ length: count }, () => plain),
    ]);
  },

  /** 門前を崩す副露かどうか(暗槓は門前を維持する) */
  isOpen(meld: Meld): boolean {
    return meld.type !== "ankan";
  },

  isKan(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },
} as const;
