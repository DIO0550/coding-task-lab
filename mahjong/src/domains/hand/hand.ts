import type { Meld } from "../meld/index.ts";
import { Tile } from "../tile/index.ts";
import { decompose } from "./decompose.ts";
import { shanten } from "./shanten.ts";
import type { WinHandInput } from "./types.ts";

const isWinning = (input: WinHandInput): boolean => decompose(input).length > 0;

const waitingTiles = (concealed13: readonly Tile[], melds: readonly Meld[]): readonly Tile[] => {
  const visibleTiles = [...concealed13, ...melds.flatMap((meld) => meld.tiles)];
  return Tile.allKinds().filter((candidate) => {
    const visibleCount = visibleTiles.filter((tile) => Tile.equals(tile, candidate)).length;
    return (
      visibleCount < 4 &&
      isWinning({
        concealed: [...concealed13, candidate],
        melds,
        winTile: candidate,
        winType: "ron",
      })
    );
  });
};

const isTenpai = (concealed: readonly Tile[], melds: readonly Meld[]): boolean =>
  waitingTiles(concealed, melds).length > 0;

export const Hand = {
  decompose,
  isWinning,
  shanten,
  isTenpai,
  waitingTiles,
} as const;
