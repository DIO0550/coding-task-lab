import { Hand } from "../../../domains/hand/index.ts";
import type { Meld } from "../../../domains/meld/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import { WinContext } from "../../../domains/win-context/index.ts";
import type {
  RiichiState,
  SituationalYaku,
  WinType,
} from "../../../domains/win-context/index.ts";
import type { Wind } from "../../../domains/wind/index.ts";
import { ScoreCalculation } from "../index.ts";
import type { ScoreOptions, ScoreOutcome } from "../index.ts";

/** 空白区切りの牌表記を牌の配列にする。 */
export const tiles = (codes: string): readonly Tile[] => {
  const trimmed = codes.trim();
  return trimmed.length === 0 ? [] : (Tile.fromCodes(trimmed.split(/\s+/)) ?? []);
};

/** 1枚の牌。 */
export const tileOf = (code: string): Tile =>
  Tile.fromCode(code) ?? { suit: "man", rank: 1, red: false };

/** 点数計算の入力。 */
export type WinParams = Readonly<{
  /** 和了牌を含む純手牌。 */
  hand: string;
  melds?: readonly Meld[];
  winTile: string;
  winType?: WinType;
  seatWind?: Wind;
  roundWind?: Wind;
  dora?: string;
  uraDora?: string;
  riichi?: RiichiState;
  ippatsu?: boolean;
  situational?: readonly SituationalYaku[];
  honba?: number;
  riichiSticks?: number;
  options?: ScoreOptions;
}>;

/** 点数計算を実行する。 */
export const outcomeOf = (params: WinParams): ScoreOutcome =>
  ScoreCalculation.calculate(
    Hand.create(tiles(params.hand), params.melds ?? []),
    WinContext.create({
      winTile: tileOf(params.winTile),
      winType: params.winType ?? "ron",
      seatWind: params.seatWind ?? "nan",
      roundWind: params.roundWind ?? "ton",
      dora: tiles(params.dora ?? ""),
      uraDora: tiles(params.uraDora ?? ""),
      riichi: params.riichi ?? "none",
      ippatsu: params.ippatsu ?? false,
      situational: params.situational ?? [],
      honba: params.honba ?? 0,
      riichiSticks: params.riichiSticks ?? 0,
    }),
    params.options,
  );

/** 成立した役名の一覧(不成立なら空)。 */
export const yakuNames = (outcome: ScoreOutcome): readonly string[] =>
  outcome.type === "scored"
    ? outcome.result.yaku.map((entry) => entry.name)
    : [];

/** 翻・符・合計点だけを取り出す(不成立なら null)。 */
export const summaryOf = (
  outcome: ScoreOutcome,
): Readonly<{ han: number; fu: number; total: number }> | null =>
  outcome.type === "scored"
    ? {
        han: outcome.result.han,
        fu: outcome.result.fu,
        total: outcome.result.score.total,
      }
    : null;
