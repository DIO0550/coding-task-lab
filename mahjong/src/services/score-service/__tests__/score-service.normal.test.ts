import { expect, test } from "vitest";
import { ScoreService } from "../index.ts";

test("正解の入力JSONで和了出力が得られる", () => {
  const input = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    melds: [],
    winTile: "5m",
    winType: "ron" as const,
    seatWind: "ton" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const output = ScoreService.calculate(input);
  expect(output.valid).toBe(true);
  if (output.valid) {
    expect(output.han).toBe(2);
    expect(output.score.total).toBe(3900);
  }
});

test("不正な入力JSONで invalid_input が返される", () => {
  const output = ScoreService.calculateFromRawInput("{ bad json }");
  expect(output).toEqual({ valid: false, reason: "invalid_input" });
});

test("和了不成立の手牌で not_winning_hand が返される", () => {
  const input = {
    hand: ["1m", "1m", "1m", "2m", "4m", "6m", "7s", "8s", "9s", "ton", "nan", "sha", "pei"],
    melds: [],
    winTile: "pei",
    winType: "ron" as const,
    seatWind: "ton" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const output = ScoreService.calculate(input);
  expect(output).toEqual({ valid: false, reason: "not_winning_hand" });
});

test("役なしの手牌で no_yaku が返される", () => {
  const input = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "nan"],
    melds: [{ type: "chi" as const, tiles: ["1s", "2s", "3s"] }],
    winTile: "nan",
    winType: "ron" as const,
    seatWind: "ton" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const output = ScoreService.calculate(input);
  expect(output).toEqual({ valid: false, reason: "no_yaku" });
});
