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

test("海底摸月はツモ和了に1翻加算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", winType: "tsumo", situational: ["haitei"] }),
  );
  expect(result).toMatchObject({ valid: true, han: 3 });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  expect(result.yaku.map((entry) => entry.name)).toContain("haitei_raoyue");
});

test("河底撈魚はロン和了に1翻加算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", situational: ["houtei"] }),
  );
  expect(result).toMatchObject({ valid: true, han: 2 });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  expect(result.yaku.map((entry) => entry.name)).toContain("houtei_raoyui");
});

test("嶺上開花は槓のあるツモ和了に1翻加算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "7s", "8s", "9s", "3p", "3p"],
      melds: [{ type: "ankan", tiles: ["1s", "1s", "1s", "1s"] }],
      winTile: "9s",
      winType: "tsumo",
      situational: ["rinshan"],
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "menzen_tsumo", han: 1 },
      { name: "rinshan_kaihou", han: 1 },
    ],
    han: 2,
    fu: 60,
    score: { total: 4000 },
  });
});

test("槍槓はロン和了に1翻加算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", situational: ["chankan"] }),
  );
  expect(result).toMatchObject({ valid: true, han: 2 });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  expect(result.yaku.map((entry) => entry.name)).toContain("chankan");
});

test("本場と供託はロンの支払いに反映される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: PINFU_HAND,
      winTile: "5s",
      riichi: "riichi",
      honba: 2,
      kyotaku: 1,
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    han: 2,
    fu: 30,
    score: {
      total: 3600,
      payments: [
        { from: "discarder", amount: 2600 },
        { from: "riichi_sticks", amount: 1000 },
      ],
    },
  });
});

test("本場はツモの支払いに各家100点ずつ反映される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({ hand: PINFU_HAND, winTile: "5s", winType: "tsumo", honba: 1 }),
  );
  expect(result).toMatchObject({
    valid: true,
    han: 2,
    fu: 20,
    score: {
      total: 1800,
      payments: [
        { from: "dealer", amount: 800 },
        { from: "non_dealer", amount: 500 },
        { from: "non_dealer", amount: 500 },
      ],
    },
  });
});
