export type TileString = string;

export type MeldTypeInput = "chi" | "pon" | "kan" | "ankan";

export type MeldInput = Readonly<{
  type: MeldTypeInput;
  tiles: readonly TileString[];
}>;

export type WinType = "tsumo" | "ron";
export type SeatWind = "ton" | "nan" | "sha" | "pei";
export type RoundWind = "ton" | "nan";
export type RiichiState = "none" | "riichi" | "double";

export type SituationalYaku =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

export type InputJson = Readonly<{
  hand: readonly TileString[];
  melds: readonly MeldInput[];
  winTile: TileString;
  winType: WinType;
  seatWind: SeatWind;
  roundWind: RoundWind;
  dora: readonly TileString[];
  uraDora: readonly TileString[];
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly SituationalYaku[];
}>;
