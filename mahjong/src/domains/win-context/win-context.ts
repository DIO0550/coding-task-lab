import { Tile } from "../tile/index.ts";
import { Wind } from "../wind/index.ts";

/** 和了の種別。 */
export type WinType = "tsumo" | "ron";

/** リーチの状態。 */
export type RiichiState = "none" | "riichi" | "double";

/** 状況役。 */
export type SituationalYaku =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

const SITUATIONAL_YAKU: readonly SituationalYaku[] = [
  "haitei",
  "houtei",
  "rinshan",
  "chankan",
  "tenhou",
  "chihou",
];

/** 和了時の状況。点数計算に必要な手牌以外の情報をまとめる。 */
export type WinContext = Readonly<{
  winTile: Tile;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  /** ドラそのもの(表示牌ではない)。 */
  dora: readonly Tile[];
  /** 裏ドラそのもの(リーチ時のみ有効)。 */
  uraDora: readonly Tile[];
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly SituationalYaku[];
  /** 本場。 */
  honba: number;
  /** 供託リーチ棒の本数。 */
  riichiSticks: number;
}>;

export type WinContextInput = Readonly<{
  winTile: Tile;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  dora?: readonly Tile[];
  uraDora?: readonly Tile[];
  riichi?: RiichiState;
  ippatsu?: boolean;
  situational?: readonly SituationalYaku[];
  honba?: number;
  riichiSticks?: number;
}>;

export const WinContext = {
  /** 既定値を補って和了状況を生成する。 */
  create(input: WinContextInput): WinContext {
    return {
      winTile: input.winTile,
      winType: input.winType,
      seatWind: input.seatWind,
      roundWind: input.roundWind,
      dora: input.dora ?? [],
      uraDora: input.uraDora ?? [],
      riichi: input.riichi ?? "none",
      ippatsu: input.ippatsu ?? false,
      situational: input.situational ?? [],
      honba: input.honba ?? 0,
      riichiSticks: input.riichiSticks ?? 0,
    };
  },

  /** 親か。 */
  isDealer(context: WinContext): boolean {
    return context.seatWind === "ton";
  },

  /** ツモ和了か。 */
  isTsumo(context: WinContext): boolean {
    return context.winType === "tsumo";
  },

  /** リーチしているか。 */
  isRiichi(context: WinContext): boolean {
    return context.riichi !== "none";
  },

  /** 指定した状況役が成立しているか。 */
  has(context: WinContext, situational: SituationalYaku): boolean {
    return context.situational.includes(situational);
  },

  /** 状況役として妥当な文字列か。 */
  isSituationalYaku(value: string): value is SituationalYaku {
    return SITUATIONAL_YAKU.includes(value as SituationalYaku);
  },

  /** リーチ状態として妥当な文字列か。 */
  isRiichiState(value: string): value is RiichiState {
    return value === "none" || value === "riichi" || value === "double";
  },

  /** 和了種別として妥当な文字列か。 */
  isWinType(value: string): value is WinType {
    return value === "tsumo" || value === "ron";
  },

  /** 場風として妥当な文字列か(東場・南場のみ)。 */
  isRoundWind(value: string): value is Wind {
    return value === "ton" || value === "nan";
  },

  /** 自風牌。 */
  seatWindTile(context: WinContext): Tile {
    return Wind.toTile(context.seatWind);
  },

  /** 場風牌。 */
  roundWindTile(context: WinContext): Tile {
    return Wind.toTile(context.roundWind);
  },

  /** 和了牌と同じ牌種か。 */
  isWinTile(context: WinContext, tile: Tile): boolean {
    return Tile.isSameKind(context.winTile, tile);
  },
} as const;
