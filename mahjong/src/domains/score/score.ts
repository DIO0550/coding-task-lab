export type WinType = "tsumo" | "ron";

export type PaymentFrom = "discarder" | "dealer" | "non_dealer" | "riichi_sticks";

export type Payment = Readonly<{
  from: PaymentFrom;
  amount: number;
}>;

export type ScoreResult = Readonly<{
  total: number;
  payments: readonly Payment[];
}>;

export type ScoreInput = Readonly<{
  han: number;
  fu: number;
  isDealer: boolean;
  winType: WinType;
  honba: number;
  kyotaku: number;
}>;

export type YakumanScoreInput = Readonly<{
  /** 役満の倍数(1=役満, 2=ダブル役満) */
  multiplier: number;
  isDealer: boolean;
  winType: WinType;
  honba: number;
  kyotaku: number;
}>;

const YAKUMAN_BASE = 8000;
const YAKUMAN_MAX_MULTIPLIER = 2;

const ceil100 = (value: number): number => Math.ceil(value / 100) * 100;

const basePoints = (han: number, fu: number): number => {
  if (han >= 13) {
    return YAKUMAN_BASE;
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
  return Math.min(fu * 2 ** (2 + han), 2000);
};

const buildResult = (
  base: number,
  input: Readonly<{ isDealer: boolean; winType: WinType; honba: number; kyotaku: number }>,
): ScoreResult => {
  const payments: Payment[] = [];
  if (input.winType === "ron") {
    const amount = ceil100(base * (input.isDealer ? 6 : 4)) + 300 * input.honba;
    payments.push({ from: "discarder", amount });
  } else if (input.isDealer) {
    const each = ceil100(base * 2) + 100 * input.honba;
    payments.push(
      { from: "non_dealer", amount: each },
      { from: "non_dealer", amount: each },
      { from: "non_dealer", amount: each },
    );
  } else {
    const fromDealer = ceil100(base * 2) + 100 * input.honba;
    const fromNonDealer = ceil100(base) + 100 * input.honba;
    payments.push(
      { from: "dealer", amount: fromDealer },
      { from: "non_dealer", amount: fromNonDealer },
      { from: "non_dealer", amount: fromNonDealer },
    );
  }
  if (input.kyotaku > 0) {
    payments.push({ from: "riichi_sticks", amount: 1000 * input.kyotaku });
  }
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return { total, payments };
};

export const Score = {
  /** 翻数・符から点数と支払い内訳を計算する(13翻以上は数え役満) */
  calculate(input: ScoreInput): ScoreResult {
    return buildResult(basePoints(input.han, input.fu), input);
  },

  /** 役満(倍数はダブル役満でキャップ)の点数を計算する */
  calculateYakuman(input: YakumanScoreInput): ScoreResult {
    const multiplier = Math.min(input.multiplier, YAKUMAN_MAX_MULTIPLIER);
    return buildResult(YAKUMAN_BASE * multiplier, input);
  },

  capYakumanMultiplier(multiplier: number): number {
    return Math.min(multiplier, YAKUMAN_MAX_MULTIPLIER);
  },
} as const;
