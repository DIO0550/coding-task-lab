import type { WinResult } from "../index.ts";

/** テスト用の点数計算入力(生JSON相当のオブジェクト)。省略項目は既定値で埋める */
export type RawInput = {
  hand: readonly string[];
  melds?: readonly unknown[];
  winTile: string;
  winType: "tsumo" | "ron";
  seatWind?: "ton" | "nan" | "sha" | "pei";
  roundWind?: "ton" | "nan";
  dora?: readonly string[];
  uraDora?: readonly string[];
  riichi?: "none" | "riichi" | "double";
  ippatsu?: boolean;
  situational?: readonly string[];
};

/** 既定は子(自風=南)・東場・ドラ無し・リーチ無し */
export const makeInput = (
  overrides: RawInput,
): Record<string, unknown> => ({
  melds: [],
  seatWind: "nan",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  ...overrides,
});

/** 和了結果であることを表明して型を絞る。役なし/不成立なら例外 */
export const asWin = (
  result: WinResult,
): Extract<WinResult, { valid: true }> => {
  if (!result.valid) {
    throw new Error(`expected a winning result but got reason=${result.reason}`);
  }
  return result;
};

/** 成立役名の一覧を返す */
export const yakuNames = (result: WinResult): readonly string[] =>
  result.valid ? result.yaku.map((entry) => entry.name) : [];

/** 指定役の翻数を返す(無ければ0) */
export const hanOf = (result: WinResult, name: string): number =>
  result.valid
    ? (result.yaku.find((entry) => entry.name === name)?.han ?? 0)
    : 0;
