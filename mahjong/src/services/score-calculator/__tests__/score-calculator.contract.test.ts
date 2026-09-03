import { test, expect } from "vitest";

import { ScoreCalculator } from "..";

import { chi, input } from "./setup";

const acceptanceJson =
  '{"hand":["1m","2m","3m","4p","5p","6p","7s","8s","9s","ton","ton","ton","5m"],"melds":[],"winTile":"5m","winType":"ron","seatWind":"ton","roundWind":"ton","dora":[],"uraDora":[],"riichi":"none","ippatsu":false,"situational":[]}';

test("受け入れ基準の入力(ダブ東・5m単騎ロン)は親ロン2翻40符3900点になる", () => {
  expect(ScoreCalculator.calculateFromJson(acceptanceJson)).toStrictEqual({
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

test.each([
  ["JSON として壊れている", "{"],
  ["空文字", ""],
  ["JSON だが object でない", "[1,2]"],
  ["必須項目がない", "{}"],
  ["不正な牌表記を含む", '{"hand":["1z","2m","3m","4p","5p","6p","7s","8s","9s","ton","ton","ton","5m","5m"],"winTile":"5m","winType":"ron","seatWind":"ton","roundWind":"ton"}'],
])("%s 入力は invalid_input になる", (_label, json) => {
  expect(ScoreCalculator.calculateFromJson(json)).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("和了牌が手牌に含まれていない入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], winTile: "9m" })),
  ).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("枚数が14枚相当でない入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton"], winTile: "ton" })),
  ).toStrictEqual({ valid: false, reason: "invalid_input" });
  expect(
    ScoreCalculator.calculate(input({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m", "5m"], winTile: "5m" })),
  ).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("同じ牌が5枚ある入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: ["1m", "1m", "1m", "1m", "0m", "5m", "5m", "5m", "5m", "7s", "8s", "9s", "ton", "ton"], winTile: "ton" })),
  ).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("和了形になっていない手は not_winning_hand になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: ["1m", "2m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], winTile: "5m" })),
  ).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("和了形でも役がなければ no_yaku になる", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], melds: [chi("2m", "3m", "4m")], winTile: "4s" }),
    ),
  ).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("ドラしかない和了形は no_yaku になる", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], melds: [chi("2m", "3m", "4m")], winTile: "4s", dora: ["9p"] }),
    ),
  ).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("未検証の JSON 値からも計算できる", () => {
  expect(ScoreCalculator.calculateFromValue(JSON.parse(acceptanceJson))).toMatchObject({ valid: true, han: 2, fu: 40 });
  expect(ScoreCalculator.calculateFromValue(undefined)).toStrictEqual({ valid: false, reason: "invalid_input" });
});
