import { test, expect } from "vitest";

import { Scoring } from "../index.ts";
import { makeInput } from "./input.ts";

test("役の無い和了形は no_yaku になる", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "2m", "3m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s"],
      melds: [{ type: "chi", tiles: ["7m", "8m", "9m"] }],
      winTile: "3m",
      winType: "ron",
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("和了形でない手は not_winning_hand になる", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "3p", "5p", "7p"],
      winTile: "9p",
      winType: "ron",
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("空文字列は invalid_input になる", () => {
  expect(Scoring.evaluateJson("")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("JSONとして不正な入力は invalid_input になる", () => {
  expect(Scoring.evaluateJson("{not json")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("不正な牌表記を含む手は invalid_input になる", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1z", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
      winTile: "5m",
      winType: "ron",
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("牌数が不足する手は invalid_input になる", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "2m", "3m", "4p", "5p"],
      winTile: "5p",
      winType: "ron",
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("必須項目(winType)が欠落した入力は invalid_input になる", () => {
  const result = Scoring.evaluate({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    melds: [],
    winTile: "5m",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
  });

  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});
