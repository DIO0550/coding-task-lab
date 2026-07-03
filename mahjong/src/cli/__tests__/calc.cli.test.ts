import { test, expect } from "vitest";

import { ScoreCalculator } from "@/src/services/score-calculator";

test("空入力は invalid_input を返す", () => {
  expect(ScoreCalculator.calculateFromJson("")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("JSONとして不正な入力は invalid_input を返す", () => {
  expect(ScoreCalculator.calculateFromJson("{not json")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("受け入れ基準の入力例(ダブ東の単騎ロン)が和了として計算される", () => {
  const input = {
    hand: [
      "1m",
      "2m",
      "3m",
      "4p",
      "5p",
      "6p",
      "7s",
      "8s",
      "9s",
      "ton",
      "ton",
      "ton",
      "5m",
    ],
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "seat_wind", han: 1 },
      { name: "round_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: {
      total: 3900,
      payments: [{ from: "discarder", amount: 3900 }],
    },
  });
});
