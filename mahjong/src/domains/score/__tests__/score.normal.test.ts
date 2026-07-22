import { expect, test } from "vitest";
import { Hand } from "../../hand/index.ts";
import { Score } from "../index.ts";

test("子の3翻30符ツモの点数計算が正しい (1000/2000)", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    [],
    "5m",
    "tsumo"
  );
  const decomp = Hand.decompose(hand)[0];
  const ctx = {
    seatWind: "nan" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const option = Score.selectHighScoreOption([decomp], ctx, 0, 0);
  expect(option).not.toBeNull();
  expect(option!.fu).toBe(40);
});

test("平和ツモが20符になる", () => {
  const hand = Hand.create(
    ["2m", "3m", "4m", "4p", "5p", "6p", "2s", "3s", "4s", "7s", "8s", "5s", "5s"],
    [],
    "9s",
    "tsumo"
  );
  const decomp = Hand.decompose(hand)[0];
  const ctx = {
    seatWind: "nan" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "riichi" as const,
    ippatsu: false,
    situational: [],
  };

  const option = Score.selectHighScoreOption([decomp], ctx, 0, 0);
  expect(option).not.toBeNull();
  expect(option!.fu).toBe(20);
});

test("七対子が25符になる", () => {
  const hand = Hand.create(
    ["1m", "1m", "3m", "3m", "5p", "5p", "7s", "7s", "9s", "9s", "ton", "ton", "nan"],
    [],
    "nan",
    "tsumo"
  );
  const decomp = Hand.decompose(hand).find((d) => d.shape === "chiitoitsu")!;
  const ctx = {
    seatWind: "nan" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "riichi" as const,
    ippatsu: false,
    situational: [],
  };

  const option = Score.selectHighScoreOption([decomp], ctx, 0, 0);
  expect(option).not.toBeNull();
  expect(option!.fu).toBe(25);
});
