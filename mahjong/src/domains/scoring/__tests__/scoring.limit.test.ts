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

const manganShapeHand = (): readonly Tile[] =>
  tiles("2m", "3m", "4m", "2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s", "6s", "6s");

const chinitsuIttsuHand = (): readonly Tile[] =>
  tiles("1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2m", "2m", "9m", "9m", "9m");

test("4翻30符は切り上げなしで7700点になる", () => {
  const winTile = tiles("5s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand: manganShapeHand(), winTile, riichi: "riichi" }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "pinfu", han: 1 },
      { name: "tanyao", han: 1 },
      { name: "iipeiko", han: 1 },
    ],
    han: 4,
    fu: 30,
    score: { total: 7700, payments: [{ from: "discarder", amount: 7700 }] },
  });
});

test("満貫(5翻)の子のロンは8000点になる", () => {
  const winTile = tiles("5s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand: manganShapeHand(), winTile, riichi: "riichi", dora: tiles("5p") }),
  );
  expect(result).toMatchObject({
    valid: true,
    han: 5,
    score: { total: 8000, payments: [{ from: "discarder", amount: 8000 }] },
  });
});

test("満貫(5翻)の親のロンは12000点になる", () => {
  const winTile = tiles("5s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: manganShapeHand(),
      winTile,
      seatWind: "ton",
      riichi: "riichi",
      dora: tiles("5p"),
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    han: 5,
    score: { total: 12000, payments: [{ from: "discarder", amount: 12000 }] },
  });
});

test("跳満(6-7翻)の子のロンは12000点になる", () => {
  const winTile = tiles("chun")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("3m", "4m", "5m", "5m", "6m", "7m", "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "honitsu", han: 3 },
      { name: "yakuhai_haku", han: 1 },
      { name: "yakuhai_hatsu", han: 1 },
      { name: "shousangen", han: 2 },
    ],
    han: 7,
    fu: 50,
    score: { total: 12000, payments: [{ from: "discarder", amount: 12000 }] },
  });
});

test("倍満(8-10翻)の子のロンは16000点になる", () => {
  const winTile = tiles("9m")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand: chinitsuIttsuHand(), winTile }));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "chinitsu", han: 6 },
      { name: "ittsu", han: 2 },
    ],
    han: 8,
    fu: 40,
    score: { total: 16000, payments: [{ from: "discarder", amount: 16000 }] },
  });
});

test("三倍満(11-12翻)の子のツモは24000点になる", () => {
  const winTile = tiles("9m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: chinitsuIttsuHand(),
      winTile,
      winType: "tsumo",
      riichi: "riichi",
      ippatsu: true,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "ippatsu", han: 1 },
      { name: "menzen_tsumo", han: 1 },
      { name: "chinitsu", han: 6 },
      { name: "ittsu", han: 2 },
    ],
    han: 11,
    fu: 30,
    score: {
      total: 24000,
      payments: [
        { from: "dealer", amount: 12000 },
        { from: "non_dealer", amount: 6000 },
        { from: "non_dealer", amount: 6000 },
      ],
    },
  });
});

test("数え役満(13翻以上)の子のツモは32000点になる", () => {
  const winTile = tiles("9m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: chinitsuIttsuHand(),
      winTile,
      winType: "tsumo",
      riichi: "riichi",
      ippatsu: true,
      situational: ["haitei"],
      dora: tiles("1m"),
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    han: 13,
    score: {
      total: 32000,
      payments: [
        { from: "dealer", amount: 16000 },
        { from: "non_dealer", amount: 8000 },
        { from: "non_dealer", amount: 8000 },
      ],
    },
  });
});

test("役満(大三元)の子のロンは32000点になる", () => {
  const winTile = tiles("9s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "2m", "3m", "4m", "9s", "9s"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "daisangen", han: 13 }],
    han: 13,
    fu: 60,
    score: { total: 32000, payments: [{ from: "discarder", amount: 32000 }] },
  });
});

test("ダブル役満(四暗刻単騎)の子のロンは64000点になる", () => {
  const winTile = tiles("5m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("1m", "1m", "1m", "9m", "9m", "9m", "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "5m", "5m"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "suuankou_tanki", han: 26 }],
    han: 26,
    fu: 70,
    score: { total: 64000, payments: [{ from: "discarder", amount: 64000 }] },
  });
});

test("1本場のロンは支払いに300点加算される", () => {
  const winTile = tiles("5m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"),
      winTile,
      seatWind: "ton",
      honba: 1,
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    score: { total: 4200, payments: [{ from: "discarder", amount: 4200 }] },
  });
});

test("供託2本は合計にのみ2000点加算される", () => {
  const winTile = tiles("5m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"),
      winTile,
      seatWind: "ton",
      kyotaku: 2,
    }),
  );
  expect(result).toMatchObject({
    valid: true,
    score: { total: 5900, payments: [{ from: "discarder", amount: 3900 }] },
  });
});
