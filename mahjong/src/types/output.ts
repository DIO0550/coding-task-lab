export type YakuResult = Readonly<{
  name: string;
  han: number;
}>;

export type PaymentResult = Readonly<{
  from: "all" | "parent" | "child" | number; // index of player if number
  amount: number;
}>;

export type ScoreResult = Readonly<{
  total: number;
  payments: readonly PaymentResult[];
}>;

export type WinningOutput = Readonly<{
  valid: true;
  yaku: readonly YakuResult[];
  han: number;
  fu: number;
  score: ScoreResult;
}>;

export type InvalidReason = "no_yaku" | "not_winning_hand" | "invalid_input";

export type InvalidOutput = Readonly<{
  valid: false;
  reason: InvalidReason;
}>;

export type OutputJson = WinningOutput | InvalidOutput;
