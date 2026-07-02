import type { Tile, Wind } from "../tile/index.ts";

export type WinType = "tsumo" | "ron";

export type RiichiType = "none" | "riichi" | "double";

export type Situational =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

/** 和了時の状況(手牌そのもの以外の情報) */
export type WinContext = Readonly<{
  winTile: Tile;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  dora: ReadonlyArray<Tile>;
  uraDora: ReadonlyArray<Tile>;
  riichi: RiichiType;
  ippatsu: boolean;
  situational: ReadonlyArray<Situational>;
  honba: number;
  kyotaku: number;
}>;

export const WinContext = {
  isDealer(context: WinContext): boolean {
    return context.seatWind === "ton";
  },

  isRiichi(context: WinContext): boolean {
    return context.riichi !== "none";
  },

  hasSituational(context: WinContext, situational: Situational): boolean {
    return context.situational.includes(situational);
  },
} as const;
