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

test("七対子としても標準形(二盃口+平和)としても解釈できる手は、点が高い標準形の解釈が採用される", () => {
  // 1m~6m+7pがそれぞれ2枚ずつの14枚。
  // 七対子(2翻25符=1600点)よりも、123m+123m+456m+456m+77p(二盃口+平和, 4翻30符=7700点)の方が高い。
  const hand = tiles(
    "1m", "1m", "2m", "2m", "3m", "3m",
    "4m", "4m", "5m", "5m", "6m", "6m",
    "7p", "7p",
  );
  const winTile = tiles("6m")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand, winTile }));

  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "ryanpeiko", han: 3 },
    ],
    han: 4,
    fu: 30,
    score: { total: 7700, payments: [{ from: "discarder", amount: 7700 }] },
  });
});

test("七対子と標準形(二盃口)の合計点が同点になる手は、翻数の大きい標準形の解釈が採用される", () => {
  // 1m~7mがそれぞれ2枚ずつの14枚(すべて同一色)。
  // 七対子(清一色込み8翻)と標準形(123m+123m+456m+456m+77m: 二盃口+平和+清一色で10翻)は
  // いずれも倍満の同点(16000点)だが、翻数が大きい標準形の解釈が採用される。
  const hand = tiles(
    "1m", "1m", "2m", "2m", "3m", "3m",
    "4m", "4m", "5m", "5m", "6m", "6m",
    "7m", "7m",
  );
  const winTile = tiles("7m")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand, winTile }));

  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "ryanpeiko", han: 3 },
      { name: "chinitsu", han: 6 },
    ],
    han: 10,
    fu: 30,
    score: { total: 16000, payments: [{ from: "discarder", amount: 16000 }] },
  });
});
