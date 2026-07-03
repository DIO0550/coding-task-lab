import type { Meld } from "../meld/index.ts";
import type { Tile } from "../tile/index.ts";

export type Wind = "ton" | "nan" | "sha" | "pei";

export type Situational =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

export type WinContext = Readonly<{
  winTile: Tile;
  winType: "tsumo" | "ron";
  seatWind: Wind;
  roundWind: "ton" | "nan";
  riichi: "none" | "riichi" | "double";
  ippatsu: boolean;
  situational: readonly Situational[];
  melds: readonly Meld[];
  isMenzen: boolean;
  rules: Readonly<{ kuitan: boolean }>;
}>;
