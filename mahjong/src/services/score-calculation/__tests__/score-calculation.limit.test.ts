import { expect, test } from "vitest";

import { outcomeOf, summaryOf } from "./score-fixture.ts";

/** リーチ+平和の2翻30符。ドラで翻数を調整する。 */
const PINFU_HAND = "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p";

/** 清一色+一気通貫+平和で9翻になる手。 */
const CHINITSU_HAND = "1m 2m 3m 4m 5m 6m 7m 8m 9m 2m 3m 4m 9m 9m";

test("切り上げ満貫を採用しないため4翻30符は7700点になる", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    riichi: "riichi",
    dora: "9p",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 4, fu: 30, total: 7700 });
});

test("5翻は満貫となり子のロンで8000点になる", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    riichi: "riichi",
    dora: "9p 2m",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 5, fu: 30, total: 8000 });
});

test("6翻は跳満となり子のロンで12000点になる", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    riichi: "riichi",
    dora: "9p 2m 3m",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 6, fu: 30, total: 12000 });
});

test("清一色と一気通貫と平和の9翻は倍満となり子のロンで16000点になる", () => {
  const outcome = outcomeOf({ hand: CHINITSU_HAND, winTile: "4m" });
  expect(summaryOf(outcome)).toStrictEqual({ han: 9, fu: 30, total: 16000 });
});

test("11翻は三倍満となり子のロンで24000点になる", () => {
  const outcome = outcomeOf({
    hand: CHINITSU_HAND,
    winTile: "4m",
    dora: "5m 6m",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 11, fu: 30, total: 24000 });
});

test("13翻以上は数え役満となり子のロンで32000点になる", () => {
  const outcome = outcomeOf({
    hand: CHINITSU_HAND,
    winTile: "4m",
    dora: "5m 6m 7m 8m",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 13, fu: 30, total: 32000 });
});

test("数え役満の上限区分は kazoe_yakuman になる", () => {
  const outcome = outcomeOf({
    hand: CHINITSU_HAND,
    winTile: "4m",
    dora: "5m 6m 7m 8m",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: { score: { limit: "kazoe_yakuman" } },
  });
});

test("親の満貫ツモは4000点オールになる", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    winType: "tsumo",
    seatWind: "ton",
    riichi: "riichi",
    dora: "9p",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: {
      score: {
        limit: "mangan",
        total: 12000,
        payments: [
          { from: "non_dealer", amount: 4000 },
          { from: "non_dealer", amount: 4000 },
          { from: "non_dealer", amount: 4000 },
        ],
      },
    },
  });
});
