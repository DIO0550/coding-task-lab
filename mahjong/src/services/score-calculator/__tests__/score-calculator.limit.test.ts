import { test, expect } from "vitest";

import { ScoreCalculator } from "..";

import { input } from "./setup";

/** リーチ・門前ツモ・平和・断么九・一盃口 = 5翻20符の手 */
const manganHand = ["2m", "2m", "3m", "3m", "4m", "4m", "4p", "5p", "6p", "5s", "6s", "7s", "8p", "8p"] as const;

test("5翻は満貫(子ツモ: 親4000・子2000 = 8000)になる", () => {
  expect(ScoreCalculator.calculate(input({ hand: manganHand, winTile: "7s", winType: "tsumo", riichi: "riichi" }))).toMatchObject({
    han: 5,
    fu: 20,
    score: { total: 8000, payments: [{ from: "dealer", amount: 4000 }, { from: "non_dealer", amount: 2000 }, { from: "non_dealer", amount: 2000 }] },
  });
});

test("親の満貫ツモは12000点になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: manganHand, winTile: "7s", winType: "tsumo", riichi: "riichi", seatWind: "ton", roundWind: "nan" })),
  ).toMatchObject({ han: 5, score: { total: 12000 } });
});

test("6翻は跳満(子ツモ12000)になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: manganHand, winTile: "7s", winType: "tsumo", riichi: "riichi", dora: ["8p"] })),
  ).toMatchObject({ han: 7, score: { total: 12000 } });
});

test("8翻は倍満(子ツモ16000)になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: manganHand, winTile: "7s", winType: "tsumo", riichi: "riichi", dora: ["2m"], ippatsu: true })),
  ).toMatchObject({ han: 8, score: { total: 16000 } });
});

test("11翻は三倍満(子ツモ24000)になる", () => {
  // 清一色6 + リーチ1 + 門前ツモ1 + 平和1 + 一気通貫2 = 11翻
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2m", "3m", "4m", "5m", "5m"], winTile: "4m", winType: "tsumo", riichi: "riichi" }),
    ),
  ).toMatchObject({ han: 11, fu: 20, score: { total: 24000 } });
});

test("13翻以上は数え役満として32000点になり、翻数が増えてもダブル役満にはならない", () => {
  // 清一色6 + リーチ1 + 門前ツモ1 + 平和1 + 一気通貫2 + ドラ3 = 14翻
  expect(
    ScoreCalculator.calculate(
      input({
        hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2m", "3m", "4m", "5m", "5m"],
        winTile: "4m",
        winType: "tsumo",
        riichi: "riichi",
        dora: ["5m"],
      }),
    ),
  ).toMatchObject({ han: 14, score: { total: 32000 } });
});

test("役満は子ロン32000点・親ロン48000点になる", () => {
  const hand = ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "8s", "8s", "8s", "pei", "pei"] as const;
  expect(ScoreCalculator.calculate(input({ hand, winTile: "8s", winType: "tsumo" }))).toMatchObject({
    yaku: [{ name: "suuankou", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
  expect(ScoreCalculator.calculate(input({ hand, winTile: "8s", winType: "tsumo", seatWind: "ton" }))).toMatchObject({
    score: { total: 48000 },
  });
});

test("ダブル役満は子ロン64000点・親ロン96000点になる", () => {
  const hand = ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "8s", "8s", "8s", "pei", "pei"] as const;
  expect(ScoreCalculator.calculate(input({ hand, winTile: "pei" }))).toMatchObject({
    yaku: [{ name: "suuankou_tanki", han: 26 }],
    han: 26,
    score: { total: 64000 },
  });
  expect(ScoreCalculator.calculate(input({ hand, winTile: "pei", seatWind: "ton" }))).toMatchObject({ score: { total: 96000 } });
});

test("役満同士の複合はダブル役満(64000点)を上限とする", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "ton", "ton", "ton", "nan", "nan"], winTile: "nan" }),
    ),
  ).toMatchObject({ han: 26, score: { total: 64000 } });
});

test("国士無双十三面待ちの親ツモは子全員32000点の支払いになる", () => {
  expect(
    ScoreCalculator.calculate(
      input({
        hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"],
        winTile: "chun",
        winType: "tsumo",
        seatWind: "ton",
      }),
    ),
  ).toMatchObject({
    han: 26,
    score: {
      total: 96000,
      payments: [
        { from: "non_dealer", amount: 32000 },
        { from: "non_dealer", amount: 32000 },
        { from: "non_dealer", amount: 32000 },
      ],
    },
  });
});
