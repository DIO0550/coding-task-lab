import { Tile } from "@/src/domains/tile";

export type MeldType = "chi" | "pon" | "kan" | "ankan";

/** 副露(暗槓を含む)。tiles は構成牌(赤5表記を保持する) */
export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
}>;

const isSameNormalized = (tiles: readonly Tile[]): boolean => {
  const indexes = tiles.map(Tile.toIndex);
  return indexes.every((index) => index === indexes[0]);
};

export const Meld = {
  isValid(meld: Meld): boolean {
    switch (meld.type) {
      case "chi": {
        if (meld.tiles.length !== 3) {
          return false;
        }
        const indexes = meld.tiles.map(Tile.toIndex).toSorted((a, b) => a - b);
        const suit = Tile.suitOf(meld.tiles[0]);
        return (
          suit !== null &&
          meld.tiles.every((tile) => Tile.suitOf(tile) === suit) &&
          indexes[1] === indexes[0] + 1 &&
          indexes[2] === indexes[0] + 2 &&
          Math.floor(indexes[0] / 9) === Math.floor(indexes[2] / 9)
        );
      }
      case "pon":
        return meld.tiles.length === 3 && isSameNormalized(meld.tiles);
      case "kan":
      case "ankan":
        return meld.tiles.length === 4 && isSameNormalized(meld.tiles);
    }
  },

  /** 門前を崩す副露かどうか(暗槓は門前扱い) */
  isOpen(meld: Meld): boolean {
    return meld.type !== "ankan";
  },

  isKan(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },
} as const;
