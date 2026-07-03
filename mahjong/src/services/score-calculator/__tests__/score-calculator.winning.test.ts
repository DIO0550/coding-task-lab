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

test("通常形のダブ東ロンは2翻40符で親3900点になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
      winTile: "5m",
      seatWind: "ton",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "seat_wind", han: 1 },
      { name: "round_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: { total: 3900, payments: [{ from: "discarder", amount: 3900 }] },
  });
});

test("和了牌を2枚目として含む14枚形式の手牌も受理される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m",
      ],
      winTile: "5m",
      seatWind: "ton",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 2, fu: 40, score: { total: 3900 } });
});

test("平和ツモは20符2翻として計算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      winType: "tsumo",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "menzen_tsumo", han: 1 },
      { name: "pinfu", han: 1 },
    ],
    han: 2,
    fu: 20,
    score: {
      total: 1500,
      payments: [
        { from: "dealer", amount: 700 },
        { from: "non_dealer", amount: 400 },
        { from: "non_dealer", amount: 400 },
      ],
    },
  });
});

test("七対子は25符固定で計算される", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "3p", "3p", "5s", "5s", "7m", "7m", "9p", "9p", "ton", "ton", "haku", "haku"],
      winTile: "haku",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "chiitoitsu", han: 2 }],
    han: 2,
    fu: 25,
    score: { total: 1600 },
  });
});

test("国士無双は役満として子32000点になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun",
      ],
      winTile: "9m",
      winType: "tsumo",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "kokushi_musou", han: 13 }],
    han: 13,
    fu: 0,
    score: { total: 32000 },
  });
});

test("国士無双十三面待ちはダブル役満として子64000点になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "1m",
      ],
      winTile: "1m",
      winType: "tsumo",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "kokushi_musou_juusanmen", han: 26 }],
    han: 26,
    score: {
      total: 64000,
      payments: [
        { from: "dealer", amount: 32000 },
        { from: "non_dealer", amount: 16000 },
        { from: "non_dealer", amount: 16000 },
      ],
    },
  });
});

test("二盃口と七対子の両解釈がある手は高点法で二盃口を採用する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "2m", "3m", "3m", "4m", "4m", "6p", "6p", "7p", "7p", "8p", "8p", "5s", "5s"],
      winTile: "5s",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 4, fu: 40, score: { total: 8000 } });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  const names = result.yaku.map((entry) => entry.name);
  expect(names).toContain("ryanpeiko");
  expect(names).not.toContain("chiitoitsu");
});

test("三暗刻と一盃口の両解釈がある手は高点法で三暗刻を採用する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m", "5s", "6s", "7s", "4p", "4p"],
      winTile: "4p",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 2, fu: 50, score: { total: 3200 } });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  expect(result.yaku.map((entry) => entry.name)).toContain("sanankou");
});
