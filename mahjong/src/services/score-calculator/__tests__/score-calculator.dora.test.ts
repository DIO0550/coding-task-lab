import { test, expect } from "vitest";

import { ScoreCalculator } from "../index.ts";

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

const PINFU_HAND = [
  "2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s",
];

test("ドラは持っている枚数分の翻が加算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", dora: ["9p"] }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "dora", han: 2 },
    ],
    han: 3,
    fu: 30,
    score: { total: 3900 },
  });
});

test("リーチしていない場合は裏ドラを数えない", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", uraDora: ["9p"] }),
  );
  expect(result).toMatchObject({ valid: true, han: 1 });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  expect(result.yaku.map((entry) => entry.name)).not.toContain("ura_dora");
});

test("リーチ時は裏ドラが翻に加算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", riichi: "riichi", uraDora: ["9p"] }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "pinfu", han: 1 },
      { name: "ura_dora", han: 2 },
    ],
    han: 4,
    fu: 30,
    score: { total: 7700 },
  });
});

test("赤5は赤ドラとして1枚1翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "0s", "6s", "7s", "3p", "3p"],
      melds: [{ type: "pon", tiles: ["8m", "8m", "8m"] }],
      winTile: "7s",
      dora: ["3p"],
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "tanyao", han: 1 },
      { name: "dora", han: 2 },
      { name: "aka_dora", han: 1 },
    ],
    han: 4,
    fu: 30,
    score: { total: 7700 },
  });
});

test("ドラだけでは役にならず役なしのまま", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "2s", "3s", "9m", "9m"],
      winTile: "9m",
      dora: ["9m"],
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});
