import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { calcInput } from "./input-factory.ts";

const INVALID = { valid: false, reason: "invalid_input" } as const;

test("オブジェクトでない入力は invalid_input になる", () => {
  expect(ScoreCalculation.calculate("text")).toStrictEqual(INVALID);
  expect(ScoreCalculation.calculate(null)).toStrictEqual(INVALID);
  expect(ScoreCalculation.calculate([1, 2])).toStrictEqual(INVALID);
});

test("必須フィールドが欠けた入力は invalid_input になる", () => {
  const input = calcInput();
  delete input["hand"];
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("存在しない牌表記を含む入力は invalid_input になる", () => {
  const input = calcInput({ winTile: "10m" });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("手牌の枚数が不正な入力は invalid_input になる", () => {
  const input = calcInput({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton"],
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("和了牌が手牌に含まれない完成形の入力は invalid_input になる", () => {
  const input = calcInput({
    hand: [
      "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
      "ton", "ton", "ton", "5m", "5m",
    ],
    winTile: "9m",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("同種牌が5枚以上ある入力は invalid_input になる", () => {
  const input = calcInput({
    hand: [
      "1m", "1m", "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m",
      "7m", "8m", "9m", "9m",
    ],
    winTile: "1m",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("同色の赤5が2枚ある入力は invalid_input になる", () => {
  const input = calcInput({
    hand: [
      "0m", "0m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s",
      "ton", "ton", "ton", "5m",
    ],
    winTile: "5m",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("チーに字牌を含む入力は invalid_input になる", () => {
  const input = calcInput({
    hand: ["4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m", "ton", "ton"],
    melds: [{ type: "chi", tiles: ["ton", "nan", "sha"] }],
    winTile: "ton",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("ポンの構成牌が同種でない入力は invalid_input になる", () => {
  const input = calcInput({
    hand: ["4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m", "ton", "ton"],
    melds: [{ type: "pon", tiles: ["1m", "2m", "3m"] }],
    winTile: "ton",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("リーチなしで一発が指定された入力は invalid_input になる", () => {
  const input = calcInput({ riichi: "none", ippatsu: true });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("副露(暗槓以外)があるのにリーチが指定された入力は invalid_input になる", () => {
  const input = calcInput({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "5m", "5m"],
    melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
    winTile: "9s",
    riichi: "riichi",
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("ロンなのに海底が指定された入力は invalid_input になる", () => {
  const input = calcInput({ winType: "ron", situational: ["haitei"] });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("ツモなのに河底が指定された入力は invalid_input になる", () => {
  const input = calcInput({ winType: "tsumo", situational: ["houtei"] });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("槓がないのに嶺上開花が指定された入力は invalid_input になる", () => {
  const input = calcInput({ winType: "tsumo", situational: ["rinshan"] });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("子なのに天和が指定された入力は invalid_input になる", () => {
  const input = calcInput({
    seatWind: "nan",
    winType: "tsumo",
    situational: ["tenhou"],
  });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});

test("本場に負の値が指定された入力は invalid_input になる", () => {
  const input = calcInput({ honba: -1 });
  expect(ScoreCalculation.calculate(input)).toStrictEqual(INVALID);
});
