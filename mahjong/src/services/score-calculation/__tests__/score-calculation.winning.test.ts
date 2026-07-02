import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput } from "./input-factory.ts";

test("和了形でない手は not_winning_hand になる", () => {
  const input = calcInput({
    hand: [
      "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
      "ton", "ton", "nan", "sha", "pei",
    ],
    winTile: "pei",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual({
    valid: false,
    reason: "not_winning_hand",
  });
});

test("同種4枚を2対子と数える七対子形は not_winning_hand になる", () => {
  const input = calcInput({
    hand: [
      "1m", "1m", "1m", "1m", "3p", "3p", "5p", "5p", "7s", "7s",
      "9s", "9s", "ton", "ton",
    ],
    winTile: "ton",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual({
    valid: false,
    reason: "not_winning_hand",
  });
});

test("通常形の和了(仕様の入力例)は連風牌2翻40符の親ロン3900点になる", () => {
  const result = asWin(ScoreCalculation.calculate(calcInput()));
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

test("和了牌を含む14枚形式の手牌でも同じ結果になる", () => {
  const thirteenForm = ScoreCalculation.calculate(calcInput());
  const fourteenForm = ScoreCalculation.calculate(
    calcInput({
      hand: [
        "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
        "ton", "ton", "ton", "5m", "5m",
      ],
    }),
  );
  expect(fourteenForm).toStrictEqual(thirteenForm);
});

test("七対子の手は chiitoitsu 2翻25符として和了できる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "4m", "4m", "6p", "6p", "8p", "8p", "2s", "2s",
          "5s", "5s", "haku",
        ],
        winTile: "haku",
        seatWind: "nan",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "chiitoitsu", han: 2 }]);
  expect(result.han).toBe(2);
  expect(result.fu).toBe(25);
  expect(result.score.total).toBe(1600);
});

test("国士無双(単騎待ち)はシングル役満32000点になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha",
          "pei", "haku", "hatsu", "chun",
        ],
        winTile: "chun",
        seatWind: "nan",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "kokushi_musou", han: 13 }]);
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("国士無双十三面待ちはダブル役満64000点になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei",
          "haku", "hatsu", "chun",
        ],
        winTile: "chun",
        seatWind: "nan",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([
    { name: "kokushi_musou_juusanmen", han: 26 },
  ]);
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("和了形だが役がない手は no_yaku になる", () => {
  const input = calcInput({
    hand: [
      "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
      "sha", "sha", "sha", "5m",
    ],
    winTile: "5m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual({
    valid: false,
    reason: "no_yaku",
  });
});

test("ドラだけでは役にならず no_yaku になる", () => {
  const input = calcInput({
    hand: [
      "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
      "sha", "sha", "sha", "5m",
    ],
    winTile: "5m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
    dora: ["sha"],
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual({
    valid: false,
    reason: "no_yaku",
  });
});
