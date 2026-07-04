import { test, expect } from "vitest";

import { calculateInput } from "../calc";

test("空入力は invalid_input を返す", () => {
  expect(calculateInput("")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("仕様外の牌表記は invalid_input を返す", () => {
  const result = calculateInput(
    JSON.stringify({
      hand: ["01m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
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
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});
