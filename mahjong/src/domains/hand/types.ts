import type { Meld, MeldType } from "../meld/index.ts";
import type { Tile } from "../tile/index.ts";

export type WaitKind = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";
export type BlockKind = "shuntsu" | "koutsu" | "kantsu";

export type Block = Readonly<{
  kind: BlockKind;
  tiles: readonly Tile[];
  open: boolean;
  meldType: MeldType | null;
}>;

export type StandardDecomposition = Readonly<{
  kind: "standard";
  pair: readonly [Tile, Tile];
  blocks: readonly [Block, Block, Block, Block];
  wait: WaitKind;
  winBlockIndex: number | null;
}>;

export type ChiitoiDecomposition = Readonly<{
  kind: "chiitoitsu";
  pairs: readonly (readonly [Tile, Tile])[];
}>;

export type KokushiDecomposition = Readonly<{
  kind: "kokushi";
  thirteenWait: boolean;
}>;

export type Decomposition = StandardDecomposition | ChiitoiDecomposition | KokushiDecomposition;

export type WinHandInput = Readonly<{
  concealed: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  winType: "tsumo" | "ron";
}>;
