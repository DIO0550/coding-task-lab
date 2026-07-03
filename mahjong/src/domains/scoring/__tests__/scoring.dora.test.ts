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

test("ドラは手牌+副露牌との一致数が翻として加算される", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand: yakuhaiHand(), winTile, dora: tiles("haku") }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "yakuhai_haku", han: 1 },
      { name: "dora", han: 3 },
    ],
    han: 4,
    fu: 40,
    score: { total: 8000, payments: [{ from: "discarder", amount: 8000 }] },
  });
});

test("リーチしていない場合は裏ドラが指定されていても計上されない", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand: yakuhaiHand(), winTile, uraDora: tiles("2m") }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "yakuhai_haku", han: 1 }],
    han: 1,
    fu: 40,
    score: { total: 1300, payments: [{ from: "discarder", amount: 1300 }] },
  });
});

test("リーチしている場合は裏ドラが翻として加算される", () => {
  const winTile = tiles("2m")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand: yakuhaiHand(), winTile, riichi: "riichi", uraDora: tiles("2m") }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "yakuhai_haku", han: 1 },
      { name: "ura_dora", han: 3 },
    ],
    han: 5,
    fu: 40,
    score: { total: 8000, payments: [{ from: "discarder", amount: 8000 }] },
  });
});

test("赤ドラありのルールでは手牌中の赤5が翻として加算される", () => {
  const hand = tiles("2m", "3m", "4m", "0m", "6m", "7m", "4p", "5p", "5s", "6s", "7s", "1s", "1s", "6p");
  const winTile = tiles("6p")[0] as Tile;
  const result = Scoring.calculate(baseInput({ hand, winTile }));
  expect(result).toStrictEqual({
    valid: true,
    yaku: [
      { name: "pinfu", han: 1 },
      { name: "aka_dora", han: 1 },
    ],
    han: 2,
    fu: 30,
    score: { total: 2000, payments: [{ from: "discarder", amount: 2000 }] },
  });
});

test("赤ドラなしのルールでは手牌中に赤5があっても加算されない", () => {
  const hand = tiles("2m", "3m", "4m", "0m", "6m", "7m", "4p", "5p", "5s", "6s", "7s", "1s", "1s", "6p");
  const winTile = tiles("6p")[0] as Tile;
  const result = Scoring.calculate(
    baseInput({ hand, winTile, rules: { kuitan: true, redDora: false } }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "pinfu", han: 1 }],
    han: 1,
    fu: 30,
    score: { total: 1000, payments: [{ from: "discarder", amount: 1000 }] },
  });
});
