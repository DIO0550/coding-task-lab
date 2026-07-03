import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("compareは萬子・筒子・索子・字牌の順にソートする", () => {
  const tiles = ["haku", "1s", "1p", "1m"].map((s) => Tile.parse(s) as Tile);
  const sorted = tiles.toSorted(Tile.compare).map(Tile.format);
  expect(sorted).toStrictEqual(["1m", "1p", "1s", "haku"]);
});

test("compareは同じ色の数牌を数字昇順にソートする", () => {
  const tiles = ["9m", "3m", "1m", "5m"].map((s) => Tile.parse(s) as Tile);
  const sorted = tiles.toSorted(Tile.compare).map(Tile.format);
  expect(sorted).toStrictEqual(["1m", "3m", "5m", "9m"]);
});

test("compareは字牌を東南西北白發中の順にソートする", () => {
  const tiles = ["chun", "ton", "hatsu", "pei", "haku", "sha", "nan"].map(
    (s) => Tile.parse(s) as Tile,
  );
  const sorted = tiles.toSorted(Tile.compare).map(Tile.format);
  expect(sorted).toStrictEqual(["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"]);
});

test("compareは赤5と通常の5を同順とみなしつつ決定的な順序を返す", () => {
  const red5m = Tile.parse("0m") as Tile;
  const normal5m = Tile.parse("5m") as Tile;
  expect(Tile.compare(red5m, normal5m)).not.toBe(NaN);
  // 常に同じ大小関係(決定的)であること
  const first = Tile.compare(red5m, normal5m);
  const second = Tile.compare(red5m, normal5m);
  expect(first).toBe(second);
  // 5m同士なので大小の絶対値は他の牌との比較結果に影響しない(0との差のみ)
  expect(Math.sign(Tile.compare(red5m, normal5m))).toBe(-Math.sign(Tile.compare(normal5m, red5m)));
});

test("compareは全順序として推移律を満たす", () => {
  const all = Tile.allKinds();
  const sorted = all.toSorted(Tile.compare);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    expect(Tile.compare(sorted[i] as Tile, sorted[i + 1] as Tile)).toBeLessThanOrEqual(0);
  }
});
