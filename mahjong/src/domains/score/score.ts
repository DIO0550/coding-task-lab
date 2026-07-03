export type PaymentSource = "dealer" | "non_dealer" | "discarder" | "pot";

export type Payment = Readonly<{
  from: PaymentSource;
  amount: number;
}>;

export type Score = Readonly<{
  total: number;
  payments: readonly Payment[];
}>;

export type ScoreInput = Readonly<{
  han: number;
  fu: number;
  /** 役満単位(0なら通常手)。複合は2まで */
  yakumanUnits: number;
  isDealer: boolean;
  winType: "tsumo" | "ron";
  honba: number;
  kyotaku: number;
}>;

const ceil100 = (value: number): number => Math.ceil(value / 100) * 100;

/** 基本点。役満 > 数え役満 > 三倍満 > 倍満 > 跳満 > 満貫 > 符×2^(2+翻) */
const basePoints = (han: number, fu: number, yakumanUnits: number): number => {
  if (yakumanUnits > 0) {
    return 8000 * Math.min(yakumanUnits, 2);
  }
  if (han >= 13) {
    return 8000;
  }
  if (han >= 11) {
    return 6000;
  }
  if (han >= 8) {
    return 4000;
  }
  if (han >= 6) {
    return 3000;
  }
  if (han >= 5) {
    return 2000;
  }
  // 切り上げ満貫なし: 2000点を超える場合のみ満貫に丸める
  return Math.min(fu * 2 ** (2 + han), 2000);
};

export const Score = {
  calculate(input: ScoreInput): Score {
    const base = basePoints(input.han, input.fu, input.yakumanUnits);
    const potPayments: readonly Payment[] =
      input.kyotaku > 0 ? [{ from: "pot", amount: input.kyotaku * 1000 }] : [];

    if (input.winType === "ron") {
      const amount =
        ceil100(base * (input.isDealer ? 6 : 4)) + input.honba * 300;
      const payments = [
        { from: "discarder" as const, amount },
        ...potPayments,
      ];
      return {
        total: payments.reduce((sum, p) => sum + p.amount, 0),
        payments,
      };
    }

    if (input.isDealer) {
      const each = ceil100(base * 2) + input.honba * 100;
      const payments = [
        { from: "non_dealer" as const, amount: each },
        { from: "non_dealer" as const, amount: each },
        { from: "non_dealer" as const, amount: each },
        ...potPayments,
      ];
      return {
        total: payments.reduce((sum, p) => sum + p.amount, 0),
        payments,
      };
    }

    const dealerPays = ceil100(base * 2) + input.honba * 100;
    const otherPays = ceil100(base) + input.honba * 100;
    const payments = [
      { from: "dealer" as const, amount: dealerPays },
      { from: "non_dealer" as const, amount: otherPays },
      { from: "non_dealer" as const, amount: otherPays },
      ...potPayments,
    ];
    return {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      payments,
    };
  },
} as const;
