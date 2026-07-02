import type { WinType } from "../win-context/index.ts";

export type PaymentFrom = "dealer" | "non_dealer" | "discarder";

export type Payment = Readonly<{ from: PaymentFrom; amount: number }>;

export type ScoreResult = Readonly<{
  total: number;
  payments: ReadonlyArray<Payment>;
}>;

export type ScoreInput = Readonly<{
  han: number;
  fu: number;
  /** 役満の倍率(役満でなければ0)。数え役満は han >= 13 として扱う */
  yakumanUnits: number;
  dealer: boolean;
  winType: WinType;
  honba: number;
  kyotaku: number;
}>;

const YAKUMAN_BASE = 8000;
const MANGAN_BASE = 2000;

const basePoints = (input: ScoreInput): number => {
  if (input.yakumanUnits > 0) {
    return YAKUMAN_BASE * input.yakumanUnits;
  }
  if (input.han >= 13) {
    return YAKUMAN_BASE;
  }
  if (input.han >= 11) {
    return 6000;
  }
  if (input.han >= 8) {
    return 4000;
  }
  if (input.han >= 6) {
    return 3000;
  }
  if (input.han >= 5) {
    return MANGAN_BASE;
  }
  const raw = input.fu * 2 ** (2 + input.han);
  return Math.min(raw, MANGAN_BASE);
};

const roundUp100 = (value: number): number => Math.ceil(value / 100) * 100;

export const Score = {
  /** 翻・符(または役満倍率)から支払い内訳と合計(本場・供託込み)を計算する */
  calculate(input: ScoreInput): ScoreResult {
    const base = basePoints(input);
    const kyotakuPoints = input.kyotaku * 1000;

    if (input.winType === "ron") {
      const amount =
        roundUp100(base * (input.dealer ? 6 : 4)) + input.honba * 300;
      return {
        total: amount + kyotakuPoints,
        payments: [{ from: "discarder", amount }],
      };
    }

    if (input.dealer) {
      const amount = roundUp100(base * 2) + input.honba * 100;
      return {
        total: amount * 3 + kyotakuPoints,
        payments: [
          { from: "non_dealer", amount },
          { from: "non_dealer", amount },
          { from: "non_dealer", amount },
        ],
      };
    }

    const dealerAmount = roundUp100(base * 2) + input.honba * 100;
    const otherAmount = roundUp100(base) + input.honba * 100;
    return {
      total: dealerAmount + otherAmount * 2 + kyotakuPoints,
      payments: [
        { from: "dealer", amount: dealerAmount },
        { from: "non_dealer", amount: otherAmount },
        { from: "non_dealer", amount: otherAmount },
      ],
    };
  },
} as const;
