import { test, expect } from "vitest";

import type { Tile } from "../../tile/index.ts";
import { Tile as TileCompanion } from "../../tile/index.ts";
import { Scoring } from "../index.ts";
import type { ScoreInput } from "../index.ts";

const tiles = (...ss: readonly string[]): readonly Tile[] =>
  ss.map((s) => TileCompanion.parse(s) as Tile);

const baseInput = (overrides: Partial<ScoreInput>): ScoreInput => ({
  hand: [],
  melds: [],
  winTile: tiles("1m")[0] as Tile,
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
  rules: { kuitan: true, redDora: true },
  ...overrides,
});

const yakuhaiHand = (): readonly Tile[] =>
  tiles("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "haku", "haku", "haku", "2m", "2m");

test("平和ツモは20符でpinfuとmenzen_tsumoの2翻となり子は400/700点になる", () => {
  const winTile = tiles("7s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("2m", "3m", "4m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "1s", "5s", "6s", "7s"),
      winTile,
      winType: "tsumo",
    }),
  );
  expect(result).toStrictEqual({
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

test("三元牌の役牌は1翻で成立し子のロンは1300点になる", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand: yakuhaiHand(), winTile }));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "yakuhai_haku", han: 1 }],
    han: 1,
    fu: 40,
    score: { total: 1300, payments: [{ from: "discarder", amount: 1300 }] },
  });
});

test("喰いタンありのルールでは副露していてもタンヤオが成立する", () => {
  const winTile = tiles("8p")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("2m", "3m", "4m", "5m", "6m", "7m", "2s", "2s", "6p", "7p", "8p"),
      melds: [{ type: "pon", tiles: tiles("4p", "4p", "4p") }],
      winTile,
      rules: { kuitan: true, redDora: true },
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "tanyao", han: 1 }],
    han: 1,
    fu: 30,
    score: { total: 1000, payments: [{ from: "discarder", amount: 1000 }] },
  });
});

test("喰いタンなしのルールでは副露しているとタンヤオが成立せずno_yakuになる", () => {
  const winTile = tiles("8p")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("2m", "3m", "4m", "5m", "6m", "7m", "2s", "2s", "6p", "7p", "8p"),
      melds: [{ type: "pon", tiles: tiles("4p", "4p", "4p") }],
      winTile,
      rules: { kuitan: false, redDora: true },
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("リーチは1翻加算され役牌と合わせて2翻2600点になる", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand: yakuhaiHand(), winTile, riichi: "riichi" }));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "yakuhai_haku", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: { total: 2600, payments: [{ from: "discarder", amount: 2600 }] },
  });
});

test("ダブルリーチは2翻加算されriichiとは併記されず役牌と合わせて3翻5200点になる", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand: yakuhaiHand(), winTile, riichi: "double" }));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "double_riichi", han: 2 },
      { name: "yakuhai_haku", han: 1 },
    ],
    han: 3,
    fu: 40,
    score: { total: 5200, payments: [{ from: "discarder", amount: 5200 }] },
  });
});

test("一発はリーチに1翻加算され役牌と合わせて3翻5200点になる", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand: yakuhaiHand(), winTile, riichi: "riichi", ippatsu: true }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "ippatsu", han: 1 },
      { name: "yakuhai_haku", han: 1 },
    ],
    han: 3,
    fu: 40,
    score: { total: 5200, payments: [{ from: "discarder", amount: 5200 }] },
  });
});
