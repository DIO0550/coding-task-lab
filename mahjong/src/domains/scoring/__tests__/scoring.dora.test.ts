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

test("手牌に2枚あるドラは2翻として加算される", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
    dora: ["5s"],
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1, pinfu: 1, dora: 2 });
  expect(result.han).toBe(4);
  expect(result.score.total).toBe(7700);
});

test("複数種類のドラはそれぞれの枚数分加算される", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
    dora: ["2m", "5s"],
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1, pinfu: 1, dora: 3 });
  expect(result.han).toBe(5);
  expect(result.score.total).toBe(8000);
});

test("和了牌もドラとして数えられる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
    dora: ["8s"],
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1, pinfu: 1, dora: 1 });
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("リーチ和了では裏ドラが加算される", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "6s", "7s", "8s", "9s", "9s"],
    winTile: "8s",
    winType: "ron",
    riichi: "riichi",
    uraDora: ["9s"],
  });
  expect(yakuOf(result)).toStrictEqual({ riichi: 1, pinfu: 1, ura_dora: 2 });
  expect(result.han).toBe(4);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(7700);
});

test("リーチしていない和了では裏ドラは加算されない", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
    riichi: "none",
    uraDora: ["5s"],
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1, pinfu: 1 });
  expect(result.han).toBe(2);
  expect(result.score.total).toBe(2000);
});

test("赤5は手牌の形としては5として扱われ赤ドラ1翻が加算される", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "0m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ tanyao: 1, pinfu: 1, aka_dora: 1 });
  expect(result.han).toBe(3);
  expect(result.score.total).toBe(3900);
});

test("赤5はドラ表記の5にも一致しドラと赤ドラの両方が加算される", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "0m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s"],
    winTile: "8s",
    winType: "ron",
    dora: ["5m"],
  });
  expect(yakuOf(result)).toStrictEqual({
    tanyao: 1,
    pinfu: 1,
    dora: 1,
    aka_dora: 1,
  });
  expect(result.han).toBe(4);
  expect(result.score.total).toBe(7700);
});
