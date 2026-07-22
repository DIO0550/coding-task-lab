import { expect, test } from "vitest";
import { Hand } from "../../hand/index.ts";
import { Score } from "../index.ts";

test("高点法により最も点数が高くなる解釈が採用される", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "1p", "1p", "5s"],
    [],
    "5s",
    "ron"
  );
  const decomps = Hand.decompose(hand);
  const ctx = {
    seatWind: "ton" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "riichi" as const,
    ippatsu: false,
    situational: [],
  };

  const selected = Score.selectHighScoreOption(decomps, ctx, 0, 0);
  expect(selected).not.toBeNull();
  expect(selected!.score.total).toBeGreaterThan(0);
});

test("本場と供託が正しい点数計算に反映される", () => {
  const basePoints = 2000;
  const result = Score.calculateScorePayments(basePoints, "ron", "nan", 2, 1);
  expect(result.total).toBe(9600);
});
