import { test, expect } from "vitest";

import { Scoring, type ScoringInput } from "@/src/domains/scoring";

const makeInput = (
  overrides: Partial<ScoringInput> & Pick<ScoringInput, "hand" | "winTile">,
): ScoringInput => ({
  melds: [],
  winType: "ron",
  seatWind: "nan",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  honba: 0,
  kyotaku: 0,
  kuitan: true,
  ...overrides,
});

test("純手牌が12枚の入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p"],
      winTile: "3p",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("和了牌が手牌に含まれない入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s", "5s"],
      winTile: "9s",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("同一牌が5枚ある入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "1m", "1m", "1m", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "9s"],
      winTile: "1m",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("同色の赤5が2枚ある入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["0m", "0m", "6m", "7m", "8m", "1p", "2p", "3p", "4s", "5s", "6s", "ton", "ton", "ton"],
      winTile: "0m",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("副露があるのにリーチが指定された入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "8s", "8s"],
      melds: [{ type: "pon", tiles: ["5s", "5s", "5s"] }],
      winTile: "4p",
      riichi: "riichi",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("リーチなしで一発が指定された入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
      winTile: "8s",
      riichi: "none",
      ippatsu: true,
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("順子になっていないチーを含む入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s", "3s", "3s"],
      melds: [{ type: "chi", tiles: ["1m", "2m", "4m"] }],
      winTile: "7s",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("同一牌でないポンを含む入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s", "3s", "3s"],
      melds: [{ type: "pon", tiles: ["1m", "1m", "2m"] }],
      winTile: "7s",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("ロンに海底が指定された入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
      winTile: "8s",
      winType: "ron",
      situational: ["haitei"],
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("ツモに河底が指定された入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
      winTile: "8s",
      winType: "tsumo",
      situational: ["houtei"],
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("子に天和が指定された入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
      winTile: "8s",
      winType: "tsumo",
      seatWind: "nan",
      situational: ["tenhou"],
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("親に地和が指定された入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
      winTile: "8s",
      winType: "tsumo",
      seatWind: "ton",
      situational: ["chihou"],
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("本場が負数の入力は invalid_input になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
      winTile: "8s",
      honba: -1,
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("4面子1雀頭が成立しない手は not_winning_hand になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s", "9s"],
      winTile: "9s",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("同一牌4枚は七対子の2対子として扱われず not_winning_hand になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "1m", "1m", "1m", "4m", "4m", "7p", "7p", "2s", "2s", "5s", "5s", "ton", "ton"],
      winTile: "ton",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("役のない副露手のロン和了は no_yaku になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["4m", "5m", "6m", "7p", "8p", "9p", "1s", "2s", "3s", "9s", "9s"],
      melds: [{ type: "chi", tiles: ["1m", "2m", "3m"] }],
      winTile: "3s",
      winType: "ron",
      seatWind: "nan",
      roundWind: "ton",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("役のない門前手のロン和了は no_yaku になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
      winTile: "2s",
      winType: "ron",
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("ドラだけでは役にならず no_yaku になる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
      winTile: "2s",
      winType: "ron",
      dora: ["9s"],
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});
