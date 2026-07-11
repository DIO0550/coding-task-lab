import { test, expect } from "vitest";

import { calculateInput } from "../calc.ts";

const ACCEPTANCE_INPUT = JSON.stringify({
  hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
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
});

test("受入用の入力JSONは場風東+自風東の和了として評価される", () => {
  const result = calculateInput(ACCEPTANCE_INPUT);

  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "round_wind", han: 1 },
      { name: "seat_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: { total: 3900, payments: [{ from: "ron", amount: 3900 }] },
  });
});

test("不正なJSON文字列は invalid_input を返す", () => {
  expect(calculateInput("not json at all")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});
