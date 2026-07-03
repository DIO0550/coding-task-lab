import { test, expect } from "vitest";

import { ScoreCalculator } from "@/src/services/score-calculator";

/** 受け入れ基準の入力例(和了牌が含まれない13枚形) */
const acceptanceInput = {
  hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
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
} as const;

const acceptanceOutput = {
  valid: true,
  yaku: [
    { name: "seat_wind", han: 1 },
    { name: "round_wind", han: 1 },
  ],
  han: 2,
  fu: 40,
  score: {
    total: 3900,
    payments: [{ from: "discarder", amount: 3900 }],
  },
} as const;

test("受け入れ基準の入力例はダブ東2翻40符の3900点として計算される", () => {
  const result = ScoreCalculator.calculateFromJson(
    JSON.stringify(acceptanceInput),
  );
  expect(result).toStrictEqual(acceptanceOutput);
});

test("和了牌を含む14枚形の hand も受理され同じ結果になる", () => {
  const input = { ...acceptanceInput, hand: [...acceptanceInput.hand, "5m"] };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual(acceptanceOutput);
});

test("パース済みオブジェクトを渡しても同じ結果になる", () => {
  const result = ScoreCalculator.calculate(acceptanceInput);
  expect(result).toStrictEqual(acceptanceOutput);
});

test("JSONとして不正な文字列は invalid_input になる", () => {
  const result = ScoreCalculator.calculateFromJson("{invalid json");
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("オブジェクトでない入力は invalid_input になる", () => {
  expect(ScoreCalculator.calculateFromJson("42")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
  expect(ScoreCalculator.calculateFromJson("[]")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("必須フィールドが欠けた入力は invalid_input になる", () => {
  const withoutWinType = Object.fromEntries(
    Object.entries(acceptanceInput).filter(([key]) => key !== "winType"),
  );
  const result = ScoreCalculator.calculate(withoutWinType);
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("未知の牌表記を含む入力は invalid_input になる", () => {
  const input = {
    ...acceptanceInput,
    hand: [...acceptanceInput.hand.slice(0, 12), "10m"],
  };
  const result = ScoreCalculator.calculate(input);
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("純手牌が12枚の入力は invalid_input になる", () => {
  const input = { ...acceptanceInput, hand: acceptanceInput.hand.slice(0, 12) };
  const result = ScoreCalculator.calculate(input);
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("省略可能な honba と kyotaku を指定すると支払いに反映される", () => {
  const input = { ...acceptanceInput, honba: 2, kyotaku: 1 };
  const result = ScoreCalculator.calculate(input);
  expect(result).toMatchObject({
    valid: true,
    score: {
      total: 5500,
      payments: [
        { from: "discarder", amount: 4500 },
        { from: "pot", amount: 1000 },
      ],
    },
  });
});

test("honba が負数の入力は invalid_input になる", () => {
  const input = { ...acceptanceInput, honba: -1 };
  const result = ScoreCalculator.calculate(input);
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("kyotaku が整数でない入力は invalid_input になる", () => {
  const input = { ...acceptanceInput, kyotaku: 0.5 };
  const result = ScoreCalculator.calculate(input);
  expect(result).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("CLI契約では喰いタン常時ありとして副露断么九が成立する", () => {
  const input = {
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "8s", "8s"],
    melds: [{ type: "pon", tiles: ["5s", "5s", "5s"] }],
    winTile: "4p",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
  };
  const result = ScoreCalculator.calculateFromJson(JSON.stringify(input));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "tanyao", han: 1 }],
    han: 1,
    fu: 30,
    score: {
      total: 1000,
      payments: [{ from: "discarder", amount: 1000 }],
    },
  });
});
