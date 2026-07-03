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

const yakuNames = (result: ReturnType<typeof ScoreCalculator.calculate>): string[] => {
  if (!result.valid) {
    throw new Error("expected valid result");
  }
  return result.yaku.map((entry) => entry.name);
};

test("役牌(白)の刻子は1翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "2p", "2p"],
      winTile: "4m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "yakuhai_haku", han: 1 }],
    han: 1,
    fu: 40,
    score: { total: 1300 },
  });
});

test("喰いタン(副露ありのタンヤオ)は1翻で成立する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "6s", "7s", "8s", "3p", "3p"],
      melds: [{ type: "pon", tiles: ["8m", "8m", "8m"] }],
      winTile: "8s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "tanyao", han: 1 }],
    han: 1,
    fu: 30,
    score: { total: 1000 },
  });
});

test("後付けの役牌(副露した白)でも和了できる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "6s", "7s", "8s", "9m", "9m"],
      melds: [{ type: "pon", tiles: ["haku", "haku", "haku"] }],
      winTile: "8s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "yakuhai_haku", han: 1 }],
    han: 1,
    fu: 30,
    score: { total: 1000 },
  });
});

test("リーチ・一発・門前ツモ・平和は複合して4翻20符になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      winType: "tsumo",
      riichi: "riichi",
      ippatsu: true,
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "ippatsu", han: 1 },
      { name: "menzen_tsumo", han: 1 },
      { name: "pinfu", han: 1 },
    ],
    han: 4,
    fu: 20,
    score: { total: 5200 },
  });
});

test("ダブルリーチは2翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      riichi: "double",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "double_riichi", han: 2 },
      { name: "pinfu", han: 1 },
    ],
    han: 3,
    fu: 30,
    score: { total: 3900 },
  });
});

test("子の平和ロンは1000点になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      seatWind: "nan",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 1, fu: 30, score: { total: 1000 } });
});

test("親の平和ロンは1500点になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "8s", "9p", "9p", "5s"],
      winTile: "5s",
      seatWind: "ton",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 1, fu: 30, score: { total: 1500 } });
});

test("自風牌の刻子は場風でなければ自風のみ1翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s", "nan", "nan", "nan", "8s", "8s"],
      winTile: "4m",
      seatWind: "nan",
      roundWind: "ton",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "seat_wind", han: 1 }],
    han: 1,
  });
});

test("三色同順は門前で2翻になり平和と複合する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "5m", "6m", "7m", "9s", "9s"],
      winTile: "7m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "sanshoku_doujun", han: 2 },
    ],
    han: 3,
    fu: 30,
    score: { total: 3900 },
  });
});

test("一気通貫は門前で2翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2p", "3p", "4p", "9s", "9s"],
      winTile: "4p",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "ittsu", han: 2 },
    ],
    han: 3,
    fu: 30,
    score: { total: 3900 },
  });
});

test("三色同刻は2翻になり三暗刻と複合する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["2m", "2m", "2m", "2p", "2p", "2p", "2s", "2s", "2s", "3m", "4m", "5m", "haku", "haku"],
      winTile: "5m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "sanshoku_doukou", han: 2 },
      { name: "sanankou", han: 2 },
    ],
    han: 4,
    fu: 50,
    score: { total: 8000 },
  });
});

test("チャンタは門前で2翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "7p", "8p", "9p", "1s", "1s", "1s", "ton", "ton", "ton", "9s", "9s"],
      winTile: "3m",
      seatWind: "sha",
      roundWind: "nan",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 2 });
  expect(yakuNames(result)).toContain("chanta");
});

test("純チャンは門前で3翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "7m", "8m", "9m", "1p", "2p", "3p", "9s", "9s", "9s", "1s", "1s"],
      winTile: "3p",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 3 });
  expect(yakuNames(result)).toContain("junchan");
});

test("混老頭は対々和・三暗刻と複合する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "1m", "1m", "9m", "9m", "9m", "haku", "haku", "haku", "9s", "9s"],
      melds: [{ type: "pon", tiles: ["1p", "1p", "1p"] }],
      winTile: "9s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "yakuhai_haku", han: 1 },
      { name: "toitoi", han: 2 },
      { name: "sanankou", han: 2 },
      { name: "honroutou", han: 2 },
    ],
    han: 7,
    score: { total: 12000 },
  });
});

test("小三元は役牌2種と合わせて4翻になる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: [
        "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "2m", "3m", "4m", "6s", "7s", "8s",
      ],
      winTile: "8s",
    }),
  );
  expect(result).toMatchObject({ valid: true, han: 4, fu: 50, score: { total: 8000 } });
  const names = yakuNames(result);
  expect(names).toContain("shousangen");
  expect(names).toContain("yakuhai_haku");
  expect(names).toContain("yakuhai_hatsu");
});

test("混一色は副露ありで2翻に喰い下がる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2m", "2m"],
      melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
      winTile: "9m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "round_wind", han: 1 },
      { name: "ittsu", han: 1 },
      { name: "honitsu", han: 2 },
    ],
    han: 4,
    fu: 30,
    score: { total: 7700 },
  });
});

test("清一色は門前で6翻になり平和と複合する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["1m", "2m", "3m", "3m", "4m", "5m", "5m", "6m", "7m", "7m", "8m", "9m", "9m", "9m"],
      winTile: "9m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "chinitsu", han: 6 },
    ],
    han: 7,
    fu: 30,
    score: { total: 12000 },
  });
});

test("清一色は副露ありで5翻に喰い下がる", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["3m", "4m", "5m", "5m", "6m", "7m", "7m", "8m", "9m", "9m", "9m"],
      melds: [{ type: "chi", tiles: ["1m", "2m", "3m"] }],
      winTile: "8m",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [{ name: "chinitsu", han: 5 }],
    han: 5,
    score: { total: 8000 },
  });
});

test("対々和はタンヤオと複合する", () => {
  const result = ScoreCalculator.calculate(
    baseInput({
      hand: ["3m", "3m", "3m", "8p", "8p", "8p", "2s", "2s"],
      melds: [
        { type: "pon", tiles: ["5p", "5p", "5p"] },
        { type: "pon", tiles: ["7s", "7s", "7s"] },
      ],
      winTile: "2s",
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    yaku: [
      { name: "tanyao", han: 1 },
      { name: "toitoi", han: 2 },
    ],
    han: 3,
    fu: 40,
    score: { total: 5200 },
  });
});
