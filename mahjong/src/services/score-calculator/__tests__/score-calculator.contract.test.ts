import { test, expect } from "vitest";

import { ScoreCalculator } from "../index.ts";

test("設計契約書§11の標準入力例は seat_wind+round_wind の2翻40符・親ロン3900点を返す", () => {
  const input = {
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
    score: { total: 3900, payments: [{ from: "discarder", amount: 3900 }] },
  });
});
