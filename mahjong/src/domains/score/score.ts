import type { Payment, ScoreBreakdown, WinType } from "@/src/types/scoring";

/**
 * 翻・符から点数(支払い内訳)を求める。切り上げ満貫なし、数え役満は13翻以上、26翻以上はダブル役満相当。
 */
export type ScoreInput = Readonly<{
  han: number;
  fu: number;
  isDealer: boolean;
  winType: WinType;
  honba: number;
  kyotaku: number;
}>;

export type ScoreLimit =
  | "none"
  | "mangan"
  | "haneman"
  | "baiman"
  | "sanbaiman"
  | "yakuman"
  | "double_yakuman";

const HONBA_RON = 300;
const HONBA_TSUMO_EACH = 100;
const KYOTAKU_POINTS = 1000;

const roundUp100 = (value: number): number => Math.ceil(value / 100) * 100;

const sumPayments = (payments: readonly Payment[]): number =>
  payments.reduce((total, payment) => total + payment.amount, 0);

const ronPayments = (base: number, input: ScoreInput): readonly Payment[] => [
  { from: "discarder", amount: roundUp100(base * (input.isDealer ? 6 : 4)) + input.honba * HONBA_RON },
];

const tsumoPayments = (base: number, input: ScoreInput): readonly Payment[] => {
  const honba = input.honba * HONBA_TSUMO_EACH;
  if (input.isDealer) {
    const each = roundUp100(base * 2) + honba;
    return [
      { from: "non_dealer", amount: each },
      { from: "non_dealer", amount: each },
      { from: "non_dealer", amount: each },
    ];
  }
  const fromDealer = roundUp100(base * 2) + honba;
  const fromOther = roundUp100(base) + honba;
  return [
    { from: "dealer", amount: fromDealer },
    { from: "non_dealer", amount: fromOther },
    { from: "non_dealer", amount: fromOther },
  ];
};

export const Score = {
  /** 満貫以上の区分。翻数と符から決まる(役満は13翻相当として渡す) */
  limit(han: number, fu: number): ScoreLimit {
    if (han >= 26) return "double_yakuman";
    if (han >= 13) return "yakuman";
    if (han >= 11) return "sanbaiman";
    if (han >= 8) return "baiman";
    if (han >= 6) return "haneman";
    if (han >= 5 || fu * 2 ** (han + 2) >= 2000) return "mangan";
    return "none";
  },

  /** 基本点(子ロンの 1/4) */
  basePoints(han: number, fu: number): number {
    switch (Score.limit(han, fu)) {
      case "double_yakuman":
        return 16000;
      case "yakuman":
        return 8000;
      case "sanbaiman":
        return 6000;
      case "baiman":
        return 4000;
      case "haneman":
        return 3000;
      case "mangan":
        return 2000;
      case "none":
        return fu * 2 ** (han + 2);
    }
  },

  calculate(input: ScoreInput): ScoreBreakdown {
    const base = Score.basePoints(input.han, input.fu);
    const playerPayments = input.winType === "ron" ? ronPayments(base, input) : tsumoPayments(base, input);
    const kyotaku: readonly Payment[] =
      input.kyotaku > 0 ? [{ from: "kyotaku", amount: input.kyotaku * KYOTAKU_POINTS }] : [];
    const payments = [...playerPayments, ...kyotaku];
    return { total: sumPayments(payments), payments };
  },
} as const;
