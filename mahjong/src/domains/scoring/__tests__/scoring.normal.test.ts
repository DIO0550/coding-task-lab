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

const yakuOf = (result: ValidScoring): Record<string, number> =>
  Object.fromEntries(result.yaku.map((entry) => [entry.name, entry.han]));

test("平和ツモ(子)は20符2翻で400/700の計1500点になる", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "tsumo",
    seatWind: "nan",
  });
  expect(yakuOf(result)).toStrictEqual({ menzen_tsumo: 1, pinfu: 1 });
  expect(result.han).toBe(2);
  expect(result.fu).toBe(20);
  expect(result.score).toStrictEqual({
    total: 1500,
    payments: [
      { from: "dealer", amount: 700 },
      { from: "non_dealer", amount: 400 },
      { from: "non_dealer", amount: 400 },
    ],
  });
});

test("平和ツモ(親)は20符2翻で700オールの計2100点になる", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "tsumo",
    seatWind: "ton",
  });
  expect(yakuOf(result)).toStrictEqual({ menzen_tsumo: 1, pinfu: 1 });
  expect(result.fu).toBe(20);
  expect(result.score).toStrictEqual({
    total: 2100,
    payments: [
      { from: "non_dealer", amount: 700 },
      { from: "non_dealer", amount: 700 },
      { from: "non_dealer", amount: 700 },
    ],
  });
});

test("白の刻子は役牌1翻になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s", "haku", "haku", "haku", "9s", "9s"],
    winTile: "4m",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ yakuhai_haku: 1 });
  expect(result.han).toBe(1);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("自風牌の刻子は自風1翻になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s", "nan", "nan", "nan", "8s", "8s"],
    winTile: "4m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(yakuOf(result)).toStrictEqual({ seat_wind: 1 });
  expect(result.han).toBe(1);
  expect(result.score.total).toBe(1300);
});

test("場風牌の刻子は場風1翻になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s", "ton", "ton", "ton", "8s", "8s"],
    winTile: "4m",
    winType: "ron",
    seatWind: "sha",
    roundWind: "ton",
  });
  expect(yakuOf(result)).toStrictEqual({ round_wind: 1 });
  expect(result.han).toBe(1);
  expect(result.score.total).toBe(1300);
});

test("東場の東家の東刻子は自風と場風の両方で2翻になる", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
  });
  expect(yakuOf(result)).toStrictEqual({ seat_wind: 1, round_wind: 1 });
  expect(result.han).toBe(2);
  expect(result.fu).toBe(40);
  expect(result.score).toStrictEqual({
    total: 3900,
    payments: [{ from: "discarder", amount: 3900 }],
  });
});

test("么九牌を含まない門前手は断么九1翻になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "5s", "5s", "8s", "8s"],
    winTile: "8s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1 });
  expect(result.han).toBe(1);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("喰いタンありでは副露した断么九が成立する", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "8s", "8s"],
    melds: [{ type: "pon", tiles: ["5s", "5s", "5s"] }],
    winTile: "4p",
    winType: "ron",
    kuitan: true,
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1 });
  expect(result.han).toBe(1);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1000);
});

test("喰いタンなしでは副露した断么九のみの手は役なしになる", () => {
  const result = Scoring.calculate(
    makeInput({
      hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "8s", "8s"],
      melds: [{ type: "pon", tiles: ["5s", "5s", "5s"] }],
      winTile: "4p",
      winType: "ron",
      kuitan: false,
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("喰いタンなしでも門前の断么九は成立する", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
    kuitan: false,
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1, pinfu: 1 });
  expect(result.han).toBe(2);
});

test("リーチは1翻加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "ron",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1, pinfu: 1 });
  expect(result.han).toBe(2);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(2000);
});

test("ダブルリーチは2翻加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "ron",
    riichi: "double",
  });
  expect(yakuOf(result)).toStrictEqual({ double_riichi: 2, pinfu: 1 });
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("リーチ後の一発は1翻加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "3p", "4p", "5p", "9p", "9p", "6s", "7s", "8s"],
    winTile: "8s",
    winType: "ron",
    riichi: "riichi",
    ippatsu: true,
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1, ippatsu: 1, pinfu: 1 });
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("役のない門前手でもツモ和了なら門前清自摸和1翻が成立する", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
    winTile: "2s",
    winType: "tsumo",
  });
  expect(yakuOf(result)).toStrictEqual({ menzen_tsumo: 1 });
  expect(result.han).toBe(1);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1100);
});

test("海底摸月は1翻加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
    winTile: "2s",
    winType: "tsumo",
    situational: ["haitei"],
  });
  expect(yakuOf(result)).toStrictEqual({ menzen_tsumo: 1, haitei: 1 });
  expect(result.han).toBe(2);
  expect(result.score.total).toBe(2000);
});

test("河底撈魚は役のないロン和了を1翻の和了にする", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
    winTile: "2s",
    winType: "ron",
    situational: ["houtei"],
  });
  expect(yakuOf(result)).toStrictEqual({ houtei: 1 });
  expect(result.han).toBe(1);
  expect(result.score.total).toBe(1300);
});

test("嶺上開花は1翻加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
    winTile: "2s",
    winType: "tsumo",
    situational: ["rinshan"],
  });
  expect(yakuOf(result)).toStrictEqual({ menzen_tsumo: 1, rinshan: 1 });
  expect(result.han).toBe(2);
  expect(result.score.total).toBe(2000);
});

test("槍槓は1翻としてロン和了に加算される", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "2s", "3s", "9s", "9s"],
    winTile: "2s",
    winType: "ron",
    situational: ["chankan"],
  });
  expect(yakuOf(result)).toStrictEqual({ chankan: 1 });
  expect(result.han).toBe(1);
  expect(result.score.total).toBe(1300);
});

test("七対子は2翻25符として計算される", () => {
  const result = winOf({
    hand: ["1m", "1m", "4m", "4m", "7p", "7p", "2s", "2s", "5s", "5s", "ton", "ton", "haku", "haku"],
    winTile: "haku",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ chiitoitsu: 2 });
  expect(result.han).toBe(2);
  expect(result.fu).toBe(25);
  expect(result.score.total).toBe(1600);
});

test("チーを含む混全帯么九の手が和了として成立する", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "9m", "9m", "9m", "1s", "2s", "3s", "ton", "ton"],
    melds: [{ type: "chi", tiles: ["7p", "8p", "9p"] }],
    winTile: "3s",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(yakuOf(result)).toStrictEqual({ chanta: 1 });
  expect(result.han).toBe(1);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("七対子とも取れる手は高点法で二盃口・平和・清一色・断么九の解釈が採用される", () => {
  const result = winOf({
    hand: ["2p", "2p", "3p", "3p", "4p", "4p", "5p", "5p", "6p", "6p", "7p", "7p", "8p", "8p"],
    winTile: "8p",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({
    ryanpeiko: 3,
    pinfu: 1,
    tanyao: 1,
    chinitsu: 6,
  });
  expect(result.han).toBe(11);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(24000);
});

test("刻子と順子の両方に取れる手は高点法で点数の高い順子の解釈が採用される", () => {
  const result = winOf({
    hand: ["2m", "2m", "2m", "3m", "3m", "3m", "4m", "4m", "4m", "5p", "6p", "7p", "8s", "8s"],
    winTile: "4m",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ pinfu: 1, iipeiko: 1, tanyao: 1 });
  expect(result.han).toBe(3);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(3900);
});
