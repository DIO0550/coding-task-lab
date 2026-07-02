import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput, sortYaku } from "./input-factory.ts";

test("三元牌の刻子は役牌1翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s",
          "haku", "haku", "haku", "9s",
        ],
        winTile: "9s",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "haku", han: 1 }]);
  expect(result.han).toBe(1);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("喰いタン(副露ありのタンヤオ)は1翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["3p", "4p", "5p", "6p", "7p", "8p", "3s", "3s", "5s", "5s"],
        melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }],
        winTile: "5s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "tanyao", han: 1 }]);
  expect(result.han).toBe(1);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1000);
});

test("リーチ・平和のロンは2翻30符2000点になる", () => {
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
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "riichi", han: 1 },
      { name: "pinfu", han: 1 },
    ]),
  );
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(2000);
});

test("リーチ・一発・平和のロンは3翻3900点になる", () => {
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
        ippatsu: true,
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "riichi", han: 1 },
      { name: "ippatsu", han: 1 },
      { name: "pinfu", han: 1 },
    ]),
  );
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("ダブルリーチは2翻として扱われる", () => {
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
        riichi: "double",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "double_riichi", han: 2 },
      { name: "pinfu", han: 1 },
    ]),
  );
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("門前ツモは menzen_tsumo 1翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "sha", "sha", "sha", "5m",
        ],
        winTile: "5m",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "menzen_tsumo", han: 1 }]);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1500);
  expect(result.score.payments).toStrictEqual([
    { from: "dealer", amount: 700 },
    { from: "non_dealer", amount: 400 },
    { from: "non_dealer", amount: 400 },
  ]);
});

test("海底ツモは haitei 1翻が門前ツモと複合する", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "sha", "sha", "sha", "5m",
        ],
        winTile: "5m",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
        situational: ["haitei"],
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "menzen_tsumo", han: 1 },
      { name: "haitei", han: 1 },
    ]),
  );
  expect(result.score.total).toBe(2700);
});

test("河底ロンは houtei 1翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "sha", "sha", "sha", "5m",
        ],
        winTile: "5m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
        situational: ["houtei"],
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "houtei", han: 1 }]);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("嶺上開花のツモは rinshan 1翻が複合する", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "nan",
        ],
        melds: [{ type: "ankan", tiles: ["1p", "1p", "1p", "1p"] }],
        winTile: "nan",
        winType: "tsumo",
        seatWind: "sha",
        roundWind: "ton",
        situational: ["rinshan"],
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "menzen_tsumo", han: 1 },
      { name: "rinshan", han: 1 },
    ]),
  );
  expect(result.fu).toBe(60);
  expect(result.score.total).toBe(4000);
});

test("槍槓のロンは chankan 1翻が複合する", () => {
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
        situational: ["chankan"],
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "chankan", han: 1 },
      { name: "pinfu", han: 1 },
    ]),
  );
  expect(result.score.total).toBe(2000);
});

test("南家の南刻子は自風のみの1翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "nan", "nan", "nan", "5m",
        ],
        winTile: "5m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "seat_wind", han: 1 }]);
  expect(result.han).toBe(1);
});
