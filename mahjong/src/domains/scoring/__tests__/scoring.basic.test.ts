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

test("4面子1雀頭にも七対子にも国士無双にもならない手はnot_winning_handになる", () => {
  const winTile = tiles("haku")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("1m", "3m", "5m", "7p", "9p", "2s", "4s", "6s", "8s", "ton", "nan", "sha", "haku", "haku"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("副露入りで役牌もタンヤオも成立しない愚形の和了はno_yakuになる", () => {
  const winTile = tiles("9s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("5m", "6m", "7m", "3s", "4s", "5s", "7s", "8s", "9s", "2m", "2m"),
      melds: [{ type: "chi", tiles: tiles("2p", "3p", "4p") }],
      winTile,
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("役が無くドラのみ乗る手はno_yakuになる(ドラは役に数えない)", () => {
  const winTile = tiles("9s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("5m", "6m", "7m", "3s", "4s", "5s", "7s", "8s", "9s", "2m", "2m"),
      melds: [{ type: "chi", tiles: tiles("2p", "3p", "4p") }],
      winTile,
      dora: tiles("5m"),
    }),
  );
  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("通常形の和了(平和ロン)は1翻30符1000点になる", () => {
  const winTile = tiles("7s")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("2m", "3m", "4m", "5m", "6m", "7m", "4p", "5p", "6p", "1s", "1s", "5s", "6s", "7s"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "pinfu", han: 1 }],
    han: 1,
    fu: 30,
    score: { total: 1000, payments: [{ from: "discarder", amount: 1000 }] },
  });
});

test("七対子は25符2翻として計算される", () => {
  const winTile = tiles("haku")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "2s", "2s", "4s", "4s", "haku", "haku"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "chiitoitsu", han: 2 }],
    han: 2,
    fu: 25,
    score: { total: 1600, payments: [{ from: "discarder", amount: 1600 }] },
  });
});

test("国士無双は役満点として計算される", () => {
  const winTile = tiles("chun")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({
      hand: tiles("1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      winTile,
    }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "kokushi_musou", han: 13 }],
    han: 13,
    fu: 30,
    score: { total: 32000, payments: [{ from: "discarder", amount: 32000 }] },
  });
});
