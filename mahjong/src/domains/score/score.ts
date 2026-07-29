import type { WinType } from "../win-context/index.ts";

/** 点数の上限区分。 */
export type ScoreLimit =
  | "none"
  | "mangan"
  | "haneman"
  | "baiman"
  | "sanbaiman"
  | "kazoe_yakuman"
  | "yakuman";

/** 支払い者の立場。 */
export type PayerRole = "dealer" | "non_dealer" | "discarder";

/** 1人分の支払い。本場を含み、供託は含まない。 */
export type Payment = Readonly<{
  from: PayerRole;
  amount: number;
}>;

/** 点数計算の結果。 */
export type Score = Readonly<{
  /** 和了者の収入合計(本場・供託を含む)。 */
  total: number;
  /** 基本点(符と翻から求めた点数の基礎)。 */
  basePoints: number;
  limit: ScoreLimit;
  payments: readonly Payment[];
}>;

export type ScoreInput = Readonly<{
  han: number;
  fu: number;
  /** 役満の倍数。通常役のみなら0。 */
  yakumanMultiplier: number;
  isDealer: boolean;
  winType: WinType;
  honba: number;
  riichiSticks: number;
}>;

/** 満貫の基本点。 */
const MANGAN_BASE = 2000;

/** 役満1倍あたりの基本点。 */
const YAKUMAN_BASE = 8000;

/** 1本場あたりの加算(ロン)。 */
const HONBA_RON = 300;

/** 1本場あたりの加算(ツモ・1人分)。 */
const HONBA_TSUMO = 100;

/** 供託1本の点数。 */
const RIICHI_STICK = 1000;

const roundUpTo100 = (points: number): number => Math.ceil(points / 100) * 100;

const limitBase = (han: number): number | null => {
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
    return MANGAN_BASE;
  }
  return null;
};

const payment = (from: PayerRole, amount: number): Payment => ({ from, amount });

const tsumoPayments = (
  base: number,
  isDealer: boolean,
  honba: number,
): readonly Payment[] => {
  const honbaEach = HONBA_TSUMO * honba;
  if (isDealer) {
    const each = roundUpTo100(base * 2) + honbaEach;
    return [
      payment("non_dealer", each),
      payment("non_dealer", each),
      payment("non_dealer", each),
    ];
  }
  const fromDealer = roundUpTo100(base * 2) + honbaEach;
  const fromOthers = roundUpTo100(base) + honbaEach;
  return [
    payment("dealer", fromDealer),
    payment("non_dealer", fromOthers),
    payment("non_dealer", fromOthers),
  ];
};

const ronPayments = (
  base: number,
  isDealer: boolean,
  honba: number,
): readonly Payment[] => [
  payment(
    "discarder",
    roundUpTo100(base * (isDealer ? 6 : 4)) + HONBA_RON * honba,
  ),
];

export const Score = {
  /** 符と翻から基本点を求める(切り上げ満貫なし)。 */
  basePoints(han: number, fu: number, yakumanMultiplier: number): number {
    if (yakumanMultiplier > 0) {
      return YAKUMAN_BASE * yakumanMultiplier;
    }
    const limited = limitBase(han);
    if (limited !== null) {
      return limited;
    }
    return Math.min(fu * Math.pow(2, 2 + han), MANGAN_BASE);
  },

  /** 点数の上限区分。 */
  limitOf(han: number, fu: number, yakumanMultiplier: number): ScoreLimit {
    if (yakumanMultiplier > 0) {
      return "yakuman";
    }
    if (han >= 13) {
      return "kazoe_yakuman";
    }
    if (han >= 11) {
      return "sanbaiman";
    }
    if (han >= 8) {
      return "baiman";
    }
    if (han >= 6) {
      return "haneman";
    }
    if (han >= 5 || fu * Math.pow(2, 2 + han) >= MANGAN_BASE) {
      return "mangan";
    }
    return "none";
  },

  /** 点数と支払い内訳を求める。 */
  calculate(input: ScoreInput): Score {
    const basePoints = Score.basePoints(
      input.han,
      input.fu,
      input.yakumanMultiplier,
    );
    const payments =
      input.winType === "tsumo"
        ? tsumoPayments(basePoints, input.isDealer, input.honba)
        : ronPayments(basePoints, input.isDealer, input.honba);
    const paid = payments.reduce((sum, entry) => sum + entry.amount, 0);
    return {
      total: paid + RIICHI_STICK * input.riichiSticks,
      basePoints,
      limit: Score.limitOf(input.han, input.fu, input.yakumanMultiplier),
      payments,
    };
  },

  /** 支払いの合計(供託を除く)。 */
  paidTotal(score: Score): number {
    return score.payments.reduce((sum, entry) => sum + entry.amount, 0);
  },

  /** ノーテン罰符(場3,000点)の1人あたり支払い額。 */
  notenPenalty(tenpaiCount: number): Readonly<{ receive: number; pay: number }> {
    if (tenpaiCount === 0 || tenpaiCount === 4) {
      return { receive: 0, pay: 0 };
    }
    const notenCount = 4 - tenpaiCount;
    return { receive: 3000 / tenpaiCount, pay: 3000 / notenCount };
  },
} as const;
