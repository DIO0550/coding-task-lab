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

test("両面待ちの門前ロン(平和形)は30符になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "6s", "7s", "8s", "9s", "9s"],
    winTile: "8s",
    winType: "ron",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1, pinfu: 1 });
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(2000);
});

test("嵌張待ちは2符加算され平和が付かない(32符→40符)", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s", "9s", "9s"],
    winTile: "6s",
    winType: "ron",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1 });
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("辺張待ちは2符加算される(32符→40符)", () => {
  const result = winOf({
    hand: ["1m", "2m", "3m", "4m", "5m", "6m", "2p", "3p", "4p", "1s", "2s", "3s", "9s", "9s"],
    winTile: "3s",
    winType: "ron",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1 });
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("単騎待ちは2符加算される(32符→40符)", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s", "9s", "9s"],
    winTile: "9s",
    winType: "ron",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1 });
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("么九牌の暗刻は8符として計算される(暗刻2つで46符→50符)", () => {
  const result = winOf({
    hand: ["9m", "9m", "9m", "chun", "chun", "chun", "2p", "3p", "4p", "5p", "6p", "7p", "8s", "8s"],
    winTile: "4p",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ yakuhai_chun: 1 });
  expect(result.fu).toBe(50);
  expect(result.score.total).toBe(1600);
});

test("么九牌の明刻は4符として計算される(32符→40符)", () => {
  const result = winOf({
    hand: ["chun", "chun", "chun", "2p", "3p", "4p", "5p", "6p", "7p", "8s", "8s"],
    melds: [{ type: "pon", tiles: ["9m", "9m", "9m"] }],
    winTile: "4p",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ yakuhai_chun: 1 });
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});

test("字牌の暗槓は32符として計算される(54符→60符)", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "6p", "7p", "8p", "3s", "4s", "5s", "9s", "9s"],
    melds: [{ type: "ankan", tiles: ["haku", "haku", "haku", "haku"] }],
    winTile: "5s",
    winType: "tsumo",
  });
  expect(yakuOf(result)).toStrictEqual({ menzen_tsumo: 1, yakuhai_haku: 1 });
  expect(result.fu).toBe(60);
  expect(result.score).toStrictEqual({
    total: 4000,
    payments: [
      { from: "dealer", amount: 2000 },
      { from: "non_dealer", amount: 1000 },
      { from: "non_dealer", amount: 1000 },
    ],
  });
});

test("中張牌の暗槓は16符として計算される(46符→50符)", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "6m", "7m", "8m", "3s", "4s", "5s", "8s", "8s"],
    melds: [{ type: "ankan", tiles: ["5p", "5p", "5p", "5p"] }],
    winTile: "5s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1 });
  expect(result.fu).toBe(50);
  expect(result.score.total).toBe(1600);
});

test("中張牌の明槓は8符として計算される(28符→30符)", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "6m", "7m", "8m", "3s", "4s", "5s", "8s", "8s"],
    melds: [{ type: "kan", tiles: ["5p", "5p", "5p", "5p"] }],
    winTile: "5s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1 });
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1000);
});

test("喰い平和形のロンは20符ではなく30符として扱われる", () => {
  const result = winOf({
    hand: ["5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s", "3s", "3s"],
    melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }],
    winTile: "7s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1 });
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1000);
});

test("喰い平和形のツモは門前清自摸和が付かず30符になる", () => {
  const result = winOf({
    hand: ["5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s", "3s", "3s"],
    melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }],
    winTile: "7s",
    winType: "tsumo",
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1 });
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

test("連風牌(ダブ東)の雀頭は4符加算される(34符→40符)", () => {
  const result = winOf({
    hand: ["ton", "ton", "2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s"],
    winTile: "7s",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1 });
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(2000);
});

test("三元牌の雀頭は2符加算され平和が付かない(32符→40符)", () => {
  const result = winOf({
    hand: ["chun", "chun", "2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7s"],
    winTile: "7s",
    winType: "ron",
    riichi: "riichi",
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1 });
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(1300);
});
