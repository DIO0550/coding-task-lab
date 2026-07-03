import type { TileKind } from "../tile/index.ts";
import type { WinType } from "../score/index.ts";

export type Wind = "ton" | "nan" | "sha" | "pei";
export type RoundWind = Extract<Wind, "ton" | "nan">;
export type RiichiState = "none" | "riichi" | "double";
export type SituationalYaku =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

/** 和了時の状況(手牌以外の文脈) */
export type WinContext = Readonly<{
  winType: WinType;
  seatWind: Wind;
  roundWind: RoundWind;
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly SituationalYaku[];
  /** 門前か(副露が暗槓のみ、または副露なし) */
  menzen: boolean;
  honba: number;
  kyotaku: number;
}>;

const WIND_RANK: Readonly<Record<Wind, number>> = {
  ton: 1,
  nan: 2,
  sha: 3,
  pei: 4,
};

const HONOR_KIND_OFFSET = 27;

export const WinContext = {
  isDealer(context: WinContext): boolean {
    return context.seatWind === "ton";
  },

  windTileKind(wind: Wind): TileKind {
    return HONOR_KIND_OFFSET + WIND_RANK[wind] - 1;
  },

  has(context: WinContext, situational: SituationalYaku): boolean {
    return context.situational.includes(situational);
  },
} as const;
