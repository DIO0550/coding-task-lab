import { test, expect } from "vitest";

import { Tile } from "@/src/domains/tile";

import { Shanten } from "..";

test("テンパイしている手の向聴数は0になる", () => {
  expect(Shanten.calculate(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"], 0)).toBe(0);
});

test("和了形の向聴数は-1になる", () => {
  expect(Shanten.calculate(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], 0)).toBe(-1);
});

test("一向聴の手は1、二向聴の手は2になる", () => {
  expect(Shanten.calculate(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "ton", "ton", "5m", "5m", "chun"], 0)).toBe(1);
  expect(Shanten.calculate(["1m", "2m", "3m", "4p", "5p", "7s", "8s", "ton", "ton", "5m", "5m", "chun", "haku"], 0)).toBe(2);
});

test("副露している手は副露数を面子として数える", () => {
  expect(Shanten.calculate(["1m", "2m", "3m", "4p", "5p", "6p", "5m"], 2)).toBe(0);
  expect(Shanten.calculate(["4p", "5p", "6p", "5m"], 3)).toBe(0);
});

test("バラバラの13枚(数牌1・4・7と字牌)は通常形で6向聴だが国士無双で7種あれば6向聴になる", () => {
  expect(Shanten.calculate(["1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "pei"], 0)).toBe(6);
});

test("国士無双の十三面待ちは0向聴、么九牌12種は1向聴になる", () => {
  expect(Shanten.calculate(["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"], 0)).toBe(0);
  expect(Shanten.calculate(["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "2m"], 0)).toBe(1);
});

test("七対子は対子6組で0向聴、対子5組で1向聴になる", () => {
  expect(Shanten.calculate(["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "ton", "ton", "chun"], 0)).toBe(0);
  expect(Shanten.calculate(["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "ton", "chun", "2s"], 0)).toBe(1);
});

test("受け入れ牌は向聴数が下がる牌で、見えていない枚数を合計する", () => {
  const tiles: readonly Tile[] = ["2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"];
  const visible = Tile.counts(tiles);
  const ukeire = Shanten.ukeire(tiles, 0, visible);
  expect(ukeire.tiles).toStrictEqual(["1m", "4m"]);
  expect(ukeire.total).toBe(8);
});

test("打牌候補ごとに打牌後の向聴数と受け入れ枚数を評価できる", () => {
  const tiles: readonly Tile[] = ["2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m", "chun"];
  const evaluations = Shanten.evaluateDiscards(tiles, 0, Tile.counts(tiles));
  const chun = evaluations.find((evaluation) => evaluation.tile === "chun");
  const five = evaluations.find((evaluation) => evaluation.tile === "5m");
  expect(chun).toStrictEqual({ tile: "chun", shanten: 0, ukeire: 8 });
  expect(five?.shanten).toBe(1);
});
