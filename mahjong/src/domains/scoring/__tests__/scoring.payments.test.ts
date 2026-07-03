import { test, expect } from "vitest";

import { Scoring, type ScoringInput } from "@/src/domains/scoring";

type ValidScoring = Extract<Scoring, { valid: true }>;

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

const winOf = (
  overrides: Partial<ScoringInput> & Pick<ScoringInput, "hand" | "winTile">,
): ValidScoring => {
  const result = Scoring.calculate(makeInput(overrides));
  if (!result.valid) {
    throw new Error(`和了になるはずの入力が ${result.reason} と判定された`);
  }
  return result;
};

/** 断么九+平和の基本手(30符2翻ロン)。dora の指定で翻数を加算できる */
const baseHand: ScoringInput["hand"] = [
  "2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s",
];

/** 門前清自摸和のみの手(30符1翻ツモ) */
const tsumoOnlyHand: ScoringInput["hand"] = [
  "1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s",
];

test("子の30符2翻ロンは2000点になる", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", seatWind: "nan" });
  expect(result.han).toBe(2);
  expect(result.fu).toBe(30);
  expect(result.score).toStrictEqual({
    total: 2000,
    payments: [{ from: "discarder", amount: 2000 }],
  });
});

test("親の30符2翻ロンは2900点になる", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", seatWind: "ton" });
  expect(result.score).toStrictEqual({
    total: 2900,
    payments: [{ from: "discarder", amount: 2900 }],
  });
});

test("子の30符1翻ツモは300/500の計1100点になる", () => {
  const result = winOf({
    hand: tsumoOnlyHand,
    winTile: "2s",
    winType: "tsumo",
    seatWind: "nan",
  });
  expect(result.han).toBe(1);
  expect(result.fu).toBe(30);
  expect(result.score).toStrictEqual({
    total: 1100,
    payments: [
      { from: "dealer", amount: 500 },
      { from: "non_dealer", amount: 300 },
      { from: "non_dealer", amount: 300 },
    ],
  });
});

test("親の30符1翻ツモは500オールの計1500点になる", () => {
  const result = winOf({
    hand: tsumoOnlyHand,
    winTile: "2s",
    winType: "tsumo",
    seatWind: "ton",
  });
  expect(result.score).toStrictEqual({
    total: 1500,
    payments: [
      { from: "non_dealer", amount: 500 },
      { from: "non_dealer", amount: 500 },
      { from: "non_dealer", amount: 500 },
    ],
  });
});

test("子の30符3翻ロンは3900点になる", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", dora: ["3p"] });
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("親の30符3翻ロンは5800点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    seatWind: "ton",
    dora: ["3p"],
  });
  expect(result.score.total).toBe(5800);
});

test("切り上げ満貫なしのため子の30符4翻ロンは7700点になる", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", dora: ["3p", "6s"] });
  expect(result.han).toBe(4);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(7700);
});

test("切り上げ満貫なしのため親の30符4翻ロンは11600点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    seatWind: "ton",
    dora: ["3p", "6s"],
  });
  expect(result.score.total).toBe(11600);
});

test("切り上げ満貫なしのため子の60符3翻ロンは7700点になる", () => {
  const result = winOf({
    hand: ["3m", "4m", "5m", "6m", "7m", "8m", "chun", "chun", "chun", "9s", "9s"],
    melds: [{ type: "ankan", tiles: ["5p", "5p", "5p", "5p"] }],
    winTile: "7m",
    winType: "ron",
    riichi: "riichi",
    dora: ["3m"],
  });
  expect(result.han).toBe(3);
  expect(result.fu).toBe(60);
  expect(result.score.total).toBe(7700);
});

test("切り上げ満貫なしのため親の60符3翻ロンは11600点になる", () => {
  const result = winOf({
    hand: ["3m", "4m", "5m", "6m", "7m", "8m", "chun", "chun", "chun", "9s", "9s"],
    melds: [{ type: "ankan", tiles: ["5p", "5p", "5p", "5p"] }],
    winTile: "7m",
    winType: "ron",
    seatWind: "ton",
    riichi: "riichi",
    dora: ["3m"],
  });
  expect(result.score.total).toBe(11600);
});

test("40符4翻は満貫8000点になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "5s", "5s", "8s", "8s"],
    winTile: "8s",
    winType: "ron",
    riichi: "riichi",
    dora: ["8s"],
  });
  expect(result.han).toBe(4);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(8000);
});

test("5翻は符に関わらず満貫8000点になる", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", dora: ["5s", "3p"] });
  expect(result.han).toBe(5);
  expect(result.score.total).toBe(8000);
});

test("6翻は跳満12000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    dora: ["5s", "3p", "4p"],
  });
  expect(result.han).toBe(6);
  expect(result.score.total).toBe(12000);
});

test("7翻も跳満12000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    dora: ["5s", "3p", "4p", "6s"],
  });
  expect(result.han).toBe(7);
  expect(result.score.total).toBe(12000);
});

test("親の跳満は18000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    seatWind: "ton",
    dora: ["5s", "3p", "4p"],
  });
  expect(result.score.total).toBe(18000);
});

test("8翻は倍満16000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    dora: ["5s", "2m", "3m", "4m", "3p"],
  });
  expect(result.han).toBe(8);
  expect(result.score.total).toBe(16000);
});

test("親の倍満は24000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    seatWind: "ton",
    dora: ["5s", "2m", "3m", "4m", "3p"],
  });
  expect(result.score.total).toBe(24000);
});

test("11翻は三倍満24000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    dora: ["5s", "2m", "3m", "4m", "5m", "6m", "7m", "3p"],
  });
  expect(result.han).toBe(11);
  expect(result.score.total).toBe(24000);
});

test("12翻も三倍満24000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    dora: ["5s", "2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p"],
  });
  expect(result.han).toBe(12);
  expect(result.score.total).toBe(24000);
});

test("13翻以上は数え役満32000点になる", () => {
  const result = winOf({
    hand: baseHand,
    winTile: "8s",
    dora: ["5s", "2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p"],
  });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("2本場のロンは放銃者の支払いに600点が加算される", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", honba: 2 });
  expect(result.score).toStrictEqual({
    total: 2600,
    payments: [{ from: "discarder", amount: 2600 }],
  });
});

test("1本場の子ツモは各家の支払いに100点ずつ加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "tsumo",
    honba: 1,
  });
  expect(result.score).toStrictEqual({
    total: 1800,
    payments: [
      { from: "dealer", amount: 800 },
      { from: "non_dealer", amount: 500 },
      { from: "non_dealer", amount: 500 },
    ],
  });
});

test("供託2本は pot からの2000点として受け取る", () => {
  const result = winOf({ hand: baseHand, winTile: "8s", kyotaku: 2 });
  expect(result.score).toStrictEqual({
    total: 4000,
    payments: [
      { from: "discarder", amount: 2000 },
      { from: "pot", amount: 2000 },
    ],
  });
});

test("本場と供託が両方ある場合は total が支払いの合計と一致する", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "tsumo",
    honba: 1,
    kyotaku: 1,
  });
  expect(result.score).toStrictEqual({
    total: 2800,
    payments: [
      { from: "dealer", amount: 800 },
      { from: "non_dealer", amount: 500 },
      { from: "non_dealer", amount: 500 },
      { from: "pot", amount: 1000 },
    ],
  });
});
