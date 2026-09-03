import { test, expect } from "vitest";

import { ScoreCalculator } from "..";

import { input } from "./setup";

test("両面(平和)と単騎の両方に取れる待ちは点数の高い平和の解釈が採用される", () => {
  // 45666m: 456m の両面待ち(雀頭66m)なら平和、66m 単騎なら役なし
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["4m", "5m", "6m", "6m", "6m", "2p", "3p", "4p", "6s", "7s", "8s", "1s", "2s", "3s"], winTile: "6m", riichi: "riichi" }),
    ),
  ).toMatchObject({
    yaku: [
      { name: "riichi", han: 1 },
      { name: "pinfu", han: 1 },
    ],
    han: 2,
    fu: 30,
    score: { total: 2000 },
  });
});

test("役なしになる解釈があっても、役のある解釈が採用されれば和了できる", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["4m", "5m", "6m", "6m", "6m", "2p", "3p", "4p", "6s", "7s", "8s", "1s", "2s", "3s"], winTile: "6m" }),
    ),
  ).toMatchObject({ valid: true, yaku: [{ name: "pinfu", han: 1 }], score: { total: 1000 } });
});

test("二盃口形は七対子(2翻25符)より二盃口(3翻40符)の解釈が採用される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "1m", "2m", "2m", "3m", "3m", "7p", "7p", "8p", "8p", "9p", "9p", "5s", "5s"], winTile: "5s" }),
    ),
  ).toMatchObject({ yaku: [{ name: "ryanpeikou", han: 3 }], han: 3, fu: 40, score: { total: 5200 } });
});

test("111222333 は一盃口の順子解釈より三暗刻の刻子解釈が採用される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m", "7s", "8s", "9s", "2p", "2p"], winTile: "2p", winType: "tsumo" }),
    ),
  ).toMatchObject({
    yaku: [
      { name: "menzen_tsumo", han: 1 },
      { name: "sanankou", han: 2 },
    ],
    han: 3,
    fu: 40,
    score: { total: 5200 },
  });
});

test("同じ翻数なら符の高い解釈(単騎40符)が両面30符より採用される", () => {
  // 45666m + 111p: 456m 両面(雀頭66m)なら 20+2+8 = 30符、66m 単騎なら 20+2+8+2 = 32 → 40符。翻数はどちらもリーチ+門前ツモの2翻
  expect(
    ScoreCalculator.calculate(
      input({
        hand: ["4m", "5m", "6m", "6m", "6m", "7p", "8p", "9p", "7s", "8s", "9s", "1p", "1p", "1p"],
        winTile: "6m",
        winType: "tsumo",
        riichi: "riichi",
      }),
    ),
  ).toMatchObject({ han: 2, fu: 40, score: { total: 2700 } });
});
