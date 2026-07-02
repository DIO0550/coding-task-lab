import type { CalcResult, CalcSuccess, CalcYaku } from "../index.ts";

/**
 * テスト用の入力ファクトリ。デフォルトは仕様の入力例
 * (東場東家・東刻子と5m単騎のロン和了)。
 */
export const calcInput = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  hand: [
    "1m",
    "2m",
    "3m",
    "4p",
    "5p",
    "6p",
    "7s",
    "8s",
    "9s",
    "ton",
    "ton",
    "ton",
    "5m",
  ],
  melds: [],
  winTile: "5m",
  winType: "ron",
  seatWind: "ton",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  ...overrides,
});

/** 和了結果であることを検証して絞り込む */
export const asWin = (result: CalcResult): CalcSuccess => {
  if (!result.valid) {
    throw new Error(`和了結果ではない: ${JSON.stringify(result)}`);
  }
  return result;
};

/** 役の配列を名前順に整列する(出力順は契約で未規定のため) */
export const sortYaku = (
  yaku: ReadonlyArray<CalcYaku>,
): ReadonlyArray<CalcYaku> =>
  [...yaku].sort((a, b) => a.name.localeCompare(b.name));
