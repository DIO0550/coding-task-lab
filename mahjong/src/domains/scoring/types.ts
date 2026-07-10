import type { Meld } from "../meld/index.ts";
import type { Payment } from "../score/index.ts";
import type { Tile } from "../tile/index.ts";
import type { Situational, Wind } from "../win-context/index.ts";

export type ScoreInput = Readonly<{
  hand: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  winType: "tsumo" | "ron";
  seatWind: Wind;
  roundWind: "ton" | "nan";
  dora: readonly Tile[];
  uraDora: readonly Tile[];
  riichi: "none" | "riichi" | "double";
  ippatsu: boolean;
  situational: readonly Situational[];
  honba: number;
  kyotaku: number;
  rules: Readonly<{ kuitan: boolean; redDora: boolean }>;
}>;

export type ScoreResult =
  | Readonly<{
      valid: true;
      yaku: readonly Readonly<{ name: string; han: number }>[];
      han: number;
      fu: number;
      score: Readonly<{ total: number; payments: readonly Payment[] }>;
    }>
  | Readonly<{ valid: false; reason: "no_yaku" | "not_winning_hand" | "invalid_input" }>;
