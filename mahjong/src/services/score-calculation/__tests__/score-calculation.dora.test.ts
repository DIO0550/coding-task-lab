import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput, sortYaku } from "./input-factory.ts";

test("ドラは持っている枚数分の翻が加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(calcInput({ dora: ["ton"] })),
  );
  // seat_wind + round_wind + 東3枚のドラ = 5翻 → 親ロン満貫12000
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "seat_wind", han: 1 },
      { name: "round_wind", han: 1 },
      { name: "dora", han: 3 },
    ]),
  );
  expect(result.han).toBe(5);
  expect(result.score.total).toBe(12000);
});

test("裏ドラはリーチ時のみ加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "2s", "3s", "5m", "5m",
        ],
        winTile: "4s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
        riichi: "riichi",
        uraDora: ["5m"],
      }),
    ),
  );
  // riichi + pinfu + 裏ドラ2(5m×2) = 4翻30符 → 7700
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "riichi", han: 1 },
      { name: "pinfu", han: 1 },
      { name: "ura_dora", han: 2 },
    ]),
  );
  expect(result.han).toBe(4);
  expect(result.score.total).toBe(7700);
});

test("リーチしていなければ裏ドラは無視される", () => {
  const result = asWin(
    ScoreCalculation.calculate(calcInput({ uraDora: ["ton"] })),
  );
  expect(result.yaku).toStrictEqual([
    { name: "seat_wind", han: 1 },
    { name: "round_wind", han: 1 },
  ]);
  expect(result.han).toBe(2);
});

test("赤5は赤ドラとして加算され、ドラ表記の5にも一致する", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["3p", "4p", "0p", "6p", "7p", "8p", "3s", "3s", "5s", "5s"],
        melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }],
        winTile: "5s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
        dora: ["5p"],
      }),
    ),
  );
  // tanyao + ドラ1(0pが5p扱い) + 赤ドラ1 = 3翻30符 → 3900
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "tanyao", han: 1 },
      { name: "dora", han: 1 },
      { name: "aka_dora", han: 1 },
    ]),
  );
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});
