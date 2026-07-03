import type { Meld } from "../meld/index.ts";
import { Tile } from "../tile/index.ts";
import { decompose } from "./decompose.ts";
import { shanten } from "./shanten.ts";
import type { WinHandInput } from "./types.ts";

const isWinning = (input: WinHandInput): boolean => decompose(input).length > 0;

const isTenpai = (concealed: readonly Tile[], meldCount: number): boolean =>
  shanten(concealed, meldCount) === 0;

const waitingTiles = (concealed13: readonly Tile[], melds: readonly Meld[]): readonly Tile[] =>
  Tile.allKinds().filter((candidate) =>
    isWinning({
      concealed: [...concealed13, candidate],
      melds,
      winTile: candidate,
      winType: "ron",
    }),
  );

export const Hand = {
  decompose,
  isWinning,
  shanten,
  isTenpai,
  waitingTiles,
} as const;
