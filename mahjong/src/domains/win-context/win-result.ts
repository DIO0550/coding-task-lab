/** 点数計算の出力側で共有する型(ロジックは持たない) */

export type YakuResult = Readonly<{ name: string; han: number }>;

export type PayerRole = "ron" | "tsumo_dealer" | "tsumo_non_dealer";

export type Payment = Readonly<{ from: PayerRole; amount: number }>;

export type ScoreValue = Readonly<{
  total: number;
  payments: readonly Payment[];
}>;

export type WinResult =
  | Readonly<{
      valid: true;
      yaku: readonly YakuResult[];
      han: number;
      fu: number;
      score: ScoreValue;
    }>
  | Readonly<{
      valid: false;
      reason: "no_yaku" | "not_winning_hand" | "invalid_input";
    }>;
