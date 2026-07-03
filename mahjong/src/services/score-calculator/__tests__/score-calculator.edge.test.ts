import { test, expect } from "vitest";

import { ScoreCalculator } from "../index.ts";

const INVALID = { valid: false, reason: "invalid_input" } as const;

const baseInput = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  melds: [],
  winType: "ron",
  seatWind: "nan",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  ...overrides,
});

const VALID_HAND = [
  "2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s",
];

test("オブジェクトでない入力は invalid_input になる", () => {
  expect(ScoreCalculator.calculate("text")).toStrictEqual(INVALID);
  expect(ScoreCalculator.calculate(null)).toStrictEqual(INVALID);
  expect(ScoreCalculator.calculate([1, 2])).toStrictEqual(INVALID);
});

test("必須フィールドが欠けた入力は invalid_input になる", () => {
  const input = baseInput({ hand: VALID_HAND, winTile: "5s" });
  delete input.winType;
  expect(ScoreCalculator.calculate(input)).toStrictEqual(INVALID);
});

test("不正な牌表記を含む手牌は invalid_input になる", () => {
  const hand = [...VALID_HAND.slice(0, 13), "10m"];
  expect(ScoreCalculator.calculate(baseInput({ hand, winTile: "5s" }))).toStrictEqual(INVALID);
});

test("枚数が合わない手牌は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(baseInput({ hand: VALID_HAND.slice(0, 12), winTile: "5s" })),
  ).toStrictEqual(INVALID);
});

test("14枚形式で和了牌が手牌に含まれない入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(baseInput({ hand: VALID_HAND, winTile: "1p" })),
  ).toStrictEqual(INVALID);
});

test("同一牌が5枚以上ある入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: ["1m", "1m", "1m", "1m", "1m", "2m", "3m", "4m", "5p", "6p", "7p", "9s", "9s", "5s"],
        winTile: "1m",
      }),
    ),
  ).toStrictEqual(INVALID);
});

test("同色の赤5が2枚ある入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: ["0m", "0m", "5m", "2m", "3m", "4m", "5p", "6p", "7p", "6s", "7s", "8s", "9s", "9s"],
        winTile: "5m",
      }),
    ),
  ).toStrictEqual(INVALID);
});

test("リーチなしの一発は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({ hand: VALID_HAND, winTile: "5s", ippatsu: true, riichi: "none" }),
    ),
  ).toStrictEqual(INVALID);
});

test("副露(暗槓以外)があるリーチは invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: ["2m", "3m", "4m", "5p", "6p", "7p", "6s", "7s", "8s", "3p", "3p"],
        melds: [{ type: "pon", tiles: ["8m", "8m", "8m"] }],
        winTile: "8s",
        riichi: "riichi",
      }),
    ),
  ).toStrictEqual(INVALID);
});

test("ロンと海底摸月の組合せは invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({ hand: VALID_HAND, winTile: "5s", winType: "ron", situational: ["haitei"] }),
    ),
  ).toStrictEqual(INVALID);
});

test("槓のない嶺上開花は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({ hand: VALID_HAND, winTile: "5s", winType: "tsumo", situational: ["rinshan"] }),
    ),
  ).toStrictEqual(INVALID);
});

test("子の天和は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: VALID_HAND,
        winTile: "5s",
        winType: "tsumo",
        seatWind: "nan",
        situational: ["tenhou"],
      }),
    ),
  ).toStrictEqual(INVALID);
});

test("未定義の状況役は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({ hand: VALID_HAND, winTile: "5s", situational: ["renhou"] }),
    ),
  ).toStrictEqual(INVALID);
});

test("字牌のチーを含む入力は invalid_input になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: ["2m", "3m", "4m", "5p", "6p", "7p", "6s", "7s", "8s", "3p", "3p"],
        melds: [{ type: "chi", tiles: ["ton", "nan", "sha"] }],
        winTile: "8s",
      }),
    ),
  ).toStrictEqual(INVALID);
});

test("和了形になっていない手牌は not_winning_hand になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "2s", "haku", "9m", "9m"],
        winTile: "9m",
      }),
    ),
  ).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("和了形でも役がなければ no_yaku になる", () => {
  expect(
    ScoreCalculator.calculate(
      baseInput({
        hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "2s", "3s", "9m", "9m"],
        winTile: "9m",
      }),
    ),
  ).toStrictEqual({ valid: false, reason: "no_yaku" });
});
