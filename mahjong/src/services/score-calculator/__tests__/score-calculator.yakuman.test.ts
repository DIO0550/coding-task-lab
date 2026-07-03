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

test("四暗刻はツモ和了で役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "7m", "7m", "7m", "2p", "2p", "2p", "3s", "3s", "3s", "9p", "9p"],
      winTile: "3s",
      winType: "tsumo",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "suuankou", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("四暗刻形のシャンポンロンは明刻扱いで対々和・三暗刻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "7m", "7m", "7m", "2p", "2p", "2p", "3s", "3s", "3s", "9p", "9p"],
      winTile: "3s",
      winType: "ron",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "toitoi", han: 2 },
      { name: "sanankou", han: 2 },
    ],
    han: 4,
    fu: 50,
    score: { total: 8000 },
  });
});

test("四暗刻単騎はロンでもダブル役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "7m", "7m", "7m", "2p", "2p", "2p", "3s", "3s", "3s", "9p", "9p"],
      winTile: "9p",
      winType: "ron",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "suuankou_tanki", han: 26 }],
    han: 26,
    score: { total: 64000 },
  });
});

test("大三元は役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "2m", "3m", "4m", "5s", "5s",
      ],
      winTile: "4m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "daisangen", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("小四喜は役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "1p", "2p", "3p",
      ],
      winTile: "3p",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "shousuushii", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("大四喜はダブル役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["sha", "sha", "sha", "pei", "pei", "pei", "5m", "5m"],
      melds: [
        { type: "pon", tiles: ["ton", "ton", "ton"] },
        { type: "pon", tiles: ["nan", "nan", "nan"] },
      ],
      winTile: "5m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "daisuushii", han: 26 }],
    han: 26,
    score: { total: 64000 },
  });
});

test("字一色は七対子形でも役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "ton", "ton", "nan", "nan", "sha", "sha", "pei", "pei", "haku", "haku", "hatsu", "hatsu", "chun", "chun",
      ],
      winTile: "chun",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "tsuuiisou", han: 13 }],
    han: 13,
    fu: 25,
    score: { total: 32000 },
  });
});

test("清老頭は役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["9p", "9p", "9p", "9s", "9s"],
      melds: [
        { type: "pon", tiles: ["1m", "1m", "1m"] },
        { type: "pon", tiles: ["9m", "9m", "9m"] },
        { type: "pon", tiles: ["1p", "1p", "1p"] },
      ],
      winTile: "9s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "chinroutou", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("發のない緑一色も役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2s", "3s", "4s", "2s", "3s", "4s", "6s", "6s", "6s", "8s", "8s", "8s", "2s", "2s"],
      winTile: "2s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "ryuuiisou", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("純正九蓮宝燈はダブル役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "2m", "3m", "4m", "5m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"],
      winTile: "5m",
      winType: "tsumo",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "junsei_chuuren_poutou", han: 26 }],
    han: 26,
    score: { total: 64000 },
  });
});

test("九蓮宝燈は役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "2m", "3m", "4m", "5m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"],
      winTile: "9m",
      winType: "ron",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "chuuren_poutou", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("四槓子は役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["3s", "3s"],
      melds: [
        { type: "kan", tiles: ["1m", "1m", "1m", "1m"] },
        { type: "kan", tiles: ["5p", "5p", "5p", "5p"] },
        { type: "ankan", tiles: ["9s", "9s", "9s", "9s"] },
        { type: "kan", tiles: ["ton", "ton", "ton", "ton"] },
      ],
      winTile: "3s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "suukantsu", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("天和は親の配牌ツモ和了で役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      winType: "tsumo",
      seatWind: "ton",
      situational: ["tenhou"],
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "tenhou", han: 13 }],
    han: 13,
    score: { total: 48000 },
  });
});

test("地和は子の第一ツモ和了で役満になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      winType: "tsumo",
      seatWind: "nan",
      situational: ["chihou"],
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "chihou", han: 13 }],
    han: 13,
    score: { total: 32000 },
  });
});

test("役満が3つ複合してもダブル役満で頭打ちになる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "ton", "ton", "ton", "nan", "nan",
      ],
      winTile: "nan",
      winType: "tsumo",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 26, score: { total: 64000 } });
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  const names = result.yaku.map((entry) => entry.name);
  expect(names).toContain("suuankou_tanki");
  expect(names).toContain("daisangen");
  expect(names).toContain("tsuuiisou");
});

test("役満の手に通常役やドラは複合しない", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "2m", "3m", "4m", "5s", "5s",
      ],
      winTile: "4m",
      dora: ["haku"],
    }),
  );
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  const names = result.yaku.map((entry) => entry.name);
  expect(names).not.toContain("dora");
  expect(names).not.toContain("yakuhai_haku");
});
