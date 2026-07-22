import { Tile } from "../tile/index.ts";
import type { MeldInput } from "../../types/input.ts";

export type MeldType = "chi" | "pon" | "kan" | "ankan";

export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
  calledTile?: Tile;
  fromPlayerIndex?: number;
}>;

export const Meld = {
  create(
    type: MeldType,
    tiles: readonly Tile[],
    calledTile?: Tile,
    fromPlayerIndex?: number
  ): Meld {
    return {
      type,
      tiles: Tile.sort(tiles),
      calledTile,
      fromPlayerIndex,
    };
  },

  fromInput(input: MeldInput): Meld {
    const tiles = input.tiles.map((t) => Tile.parse(t));
    return Meld.create(input.type, tiles);
  },

  toInput(meld: Meld): MeldInput {
    return {
      type: meld.type,
      tiles: meld.tiles.map((t) => Tile.toString(t)),
    };
  },

  isOpen(meld: Meld): boolean {
    return meld.type !== "ankan";
  },

  isConcealed(meld: Meld): boolean {
    return meld.type === "ankan";
  },

  isSequence(meld: Meld): boolean {
    return meld.type === "chi";
  },

  isTriplet(meld: Meld): boolean {
    return meld.type === "pon";
  },

  isQuad(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },
} as const;
