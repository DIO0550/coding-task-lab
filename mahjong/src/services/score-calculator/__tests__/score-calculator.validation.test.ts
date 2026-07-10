import { test, expect } from "vitest";

import { ScoreCalculator } from "../index.ts";

const validBaseObject = (): Record<string, unknown> => ({
  hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
  melds: [],
  winTile: "5m",
  winType: "ron",
  seatWind: "ton",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
});

test("JSONとして壊れた文字列はinvalid_inputになる", () => {
  const result = ScoreCalculator.calculateFromJson("{invalid json");
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("空文字列の入力はinvalid_inputになる", () => {
  const result = ScoreCalculator.calculateFromJson("");
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("JSONの配列(オブジェクトでない)はinvalid_inputになる", () => {
  const result = ScoreCalculator.calculateFromJson("[]");
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("必須フィールドが欠落しているとinvalid_inputになる", () => {
  const rest: Record<string, unknown> = { ...validBaseObject() };
  delete rest.riichi;
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(rest));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("不明な牌表記が手牌に含まれるとinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["1x", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("手牌の枚数が和了牌込み14-3n枚でない場合はinvalid_inputになる", () => {
  const input = { ...validBaseObject(), hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "5m"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("和了牌込み14枚の手牌にwinTileが含まれない場合はinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "9m", "9m"],
    winTile: "5m",
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("和了牌を含まない13枚の手牌はinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    winTile: "5m",
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("同種牌が5枚以上になる手はinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["1m", "1m", "1m", "1m", "1m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "5m"],
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("同色の赤5が2枚以上になる手はinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["0m", "0m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("副露があるのにriichiが宣言されているとinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2s", "2s", "6p", "7p", "8p"],
    melds: [{ type: "pon", tiles: ["4p", "4p", "4p"] }],
    winTile: "8p",
    seatWind: "nan",
    riichi: "riichi",
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("riichiが無いのにippatsuがtrueだとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), ippatsu: true };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("riichiが無いのにuraDoraが非空だとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), uraDora: ["1m"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("winTypeがronなのにsituationalにhaiteiが含まれるとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "ron", situational: ["haitei"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("winTypeがtsumoなのにsituationalにhouteiが含まれるとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", situational: ["houtei"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("副露があるのにtenhouが宣言されているとinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2s", "2s", "6p", "7p", "8p"],
    melds: [{ type: "pon", tiles: ["4p", "4p", "4p"] }],
    winTile: "8p",
    winType: "tsumo",
    situational: ["tenhou"],
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("tenhouが宣言されているのに自風が親でないとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", seatWind: "nan", situational: ["tenhou"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("chihouが宣言されているのに自風が親だとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", seatWind: "ton", situational: ["chihou"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("チーの構成が連続していないとinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["4m", "5m", "6m", "7m", "8m", "9m", "2s", "2s", "6p", "7p", "8p"],
    melds: [{ type: "chi", tiles: ["4p", "5p", "7p"] }],
    winTile: "8p",
    seatWind: "nan",
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("meldのtypeが不明な文字列だとinvalid_inputになる", () => {
  const input = {
    ...validBaseObject(),
    hand: ["4m", "5m", "6m", "7m", "8m", "9m", "2s", "2s", "6p", "7p"],
    melds: [{ type: "minkan", tiles: ["4p", "4p", "4p"] }],
    winTile: "8p",
    seatWind: "nan",
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("honbaが数値でない場合はinvalid_inputになる", () => {
  const input = { ...validBaseObject(), honba: "1" };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("rulesが数値など不正な型の場合はinvalid_inputになる", () => {
  const input = { ...validBaseObject(), rules: 1 };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("honba/kyotakuを省略した場合は0として扱われる(正常系)", () => {
  const input = validBaseObject();
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.score.total).toBe(3900);
  }
});

test("rulesを省略した場合はkuitan/redDoraともにtrueとして扱われる(正常系)", () => {
  const input = {
    ...validBaseObject(),
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2s", "2s", "6p", "7p", "8p"],
    melds: [{ type: "pon", tiles: ["4p", "4p", "4p"] }],
    winTile: "8p",
    seatWind: "nan",
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "tanyao", han: 1 }],
    han: 1,
    fu: 30,
    score: { total: 1000, payments: [{ from: "discarder", amount: 1000 }] },
  });
});

test("海底と嶺上開花を同時指定するとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", situational: ["haitei", "rinshan"] };
  expect(ScoreCalculator.calculateFromJson(JSON.stringify(input))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("槓子がない手で嶺上開花を指定するとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", situational: ["rinshan"] };
  expect(ScoreCalculator.calculateFromJson(JSON.stringify(input))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("天和と立直を同時指定するとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", riichi: "riichi", situational: ["tenhou"] };
  expect(ScoreCalculator.calculateFromJson(JSON.stringify(input))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("同じ状況役を重複指定するとinvalid_inputになる", () => {
  const input = { ...validBaseObject(), winType: "tsumo", situational: ["haitei", "haitei"] };
  expect(ScoreCalculator.calculateFromJson(JSON.stringify(input))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});
