import { Tile } from "../tile/index.ts";

export type MeldType = "chi" | "pon" | "kan" | "ankan";
export type Meld = Readonly<{ type: MeldType; tiles: readonly Tile[] }>;

const isChiValid = (tiles: readonly Tile[]): boolean => {
  if (tiles.length !== 3) {
    return false;
  }
  if (!tiles.every((t) => t.kind === "number")) {
    return false;
  }
  const suit = tiles[0]?.kind === "number" ? tiles[0].suit : null;
  if (suit === null) {
    return false;
  }
  const sameSuit = tiles.every((t) => t.kind === "number" && t.suit === suit);
  if (!sameSuit) {
    return false;
  }
  const ranks = tiles
    .map((t) => (t.kind === "number" ? t.rank : 0))
    .toSorted((a, b) => a - b);
  return ranks[0] !== undefined && ranks[1] === ranks[0] + 1 && ranks[2] === ranks[0] + 2;
};

const isSameKind = (tiles: readonly Tile[]): boolean => {
  const first = tiles[0];
  if (first === undefined) {
    return false;
  }
  return tiles.every((t) => Tile.equals(t, first));
};

const isPonValid = (tiles: readonly Tile[]): boolean => tiles.length === 3 && isSameKind(tiles);
const isKanTilesValid = (tiles: readonly Tile[]): boolean => tiles.length === 4 && isSameKind(tiles);

const isValid = (m: Meld): boolean => {
  switch (m.type) {
    case "chi":
      return isChiValid(m.tiles);
    case "pon":
      return isPonValid(m.tiles);
    case "kan":
    case "ankan":
      return isKanTilesValid(m.tiles);
    default:
      return false;
  }
};

const isOpen = (m: Meld): boolean => m.type !== "ankan";
const isKan = (m: Meld): boolean => m.type === "kan" || m.type === "ankan";

export const Meld = {
  isValid,
  isOpen,
  isKan,
} as const;
