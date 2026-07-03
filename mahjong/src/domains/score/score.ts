export type PaymentFrom = "dealer" | "non_dealer" | "discarder";
export type Payment = Readonly<{ from: PaymentFrom; amount: number }>;
export type ScoreLevel =
  | "normal"
  | "mangan"
  | "haneman"
  | "baiman"
  | "sanbaiman"
  | "kazoe_yakuman"
  | "yakuman";

const BASE_POINT_CAP = 2000;
const MAX_YAKUMAN_MULTIPLIER = 2;

const RON_MULTIPLIER_DEALER = 6;
const RON_MULTIPLIER_NON_DEALER = 4;
const TSUMO_MULTIPLIER_FROM_DEALER_OR_WINNER = 2;
const TSUMO_MULTIPLIER_FROM_NON_DEALER = 1;

const HONBA_RON_UNIT = 300;
const HONBA_TSUMO_UNIT = 100;
const KYOTAKU_UNIT = 1000;

const clampYakumanMultiplier = (multiplier: number): number =>
  Math.min(Math.max(multiplier, 0), MAX_YAKUMAN_MULTIPLIER);

const roundUpToHundred = (n: number): number => Math.ceil(n / 100) * 100;

const rawBasicPoints = (han: number, fu: number): number => fu * 2 ** (2 + han);

const computeBasicPoints = (han: number, fu: number, yakumanMultiplier: number): number => {
  const clampedMultiplier = clampYakumanMultiplier(yakumanMultiplier);
  if (clampedMultiplier >= 1) {
    return 8000 * clampedMultiplier;
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
    return BASE_POINT_CAP;
  }
  return Math.min(rawBasicPoints(han, fu), BASE_POINT_CAP);
};

const computeLevel = (han: number, fu: number, yakumanMultiplier: number): ScoreLevel => {
  const clampedMultiplier = clampYakumanMultiplier(yakumanMultiplier);
  if (clampedMultiplier >= 1) {
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
  if (han >= 5) {
    return "mangan";
  }
  return rawBasicPoints(han, fu) > BASE_POINT_CAP ? "mangan" : "normal";
};

const calculatePayments = (
  args: Readonly<{
    basicPoints: number;
    isDealer: boolean;
    winType: "tsumo" | "ron";
    honba: number;
  }>,
): readonly Payment[] => {
  const { basicPoints, isDealer, winType, honba } = args;

  if (winType === "ron") {
    const multiplier = isDealer ? RON_MULTIPLIER_DEALER : RON_MULTIPLIER_NON_DEALER;
    const amount = roundUpToHundred(basicPoints * multiplier) + HONBA_RON_UNIT * honba;
    return [{ from: "discarder", amount }];
  }

  const winnerShareAmount =
    roundUpToHundred(basicPoints * TSUMO_MULTIPLIER_FROM_DEALER_OR_WINNER) +
    HONBA_TSUMO_UNIT * honba;

  if (isDealer) {
    return [
      { from: "non_dealer", amount: winnerShareAmount },
      { from: "non_dealer", amount: winnerShareAmount },
      { from: "non_dealer", amount: winnerShareAmount },
    ];
  }

  const nonDealerShareAmount =
    roundUpToHundred(basicPoints * TSUMO_MULTIPLIER_FROM_NON_DEALER) + HONBA_TSUMO_UNIT * honba;

  return [
    { from: "dealer", amount: winnerShareAmount },
    { from: "non_dealer", amount: nonDealerShareAmount },
    { from: "non_dealer", amount: nonDealerShareAmount },
  ];
};

const calculate = (
  args: Readonly<{
    han: number;
    fu: number;
    isDealer: boolean;
    winType: "tsumo" | "ron";
    honba: number;
    kyotaku: number;
    yakumanMultiplier: number;
  }>,
): Readonly<{ total: number; payments: readonly Payment[]; level: ScoreLevel }> => {
  const { han, fu, isDealer, winType, honba, kyotaku, yakumanMultiplier } = args;
  const basicPoints = computeBasicPoints(han, fu, yakumanMultiplier);
  const level = computeLevel(han, fu, yakumanMultiplier);
  const payments = calculatePayments({ basicPoints, isDealer, winType, honba });
  const total =
    payments.reduce((sum, payment) => sum + payment.amount, 0) + KYOTAKU_UNIT * kyotaku;

  return { total, payments, level };
};

export const Score = {
  calculate,
} as const;
