import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("equalsは赤5と通常の5を区別せず同じ牌として扱う", () => {
  const red5m = Tile.parse("0m") as Tile;
  const normal5m = Tile.parse("5m") as Tile;
  expect(Tile.equals(red5m, normal5m)).toBe(true);
});

test("equalsは種類・数字が異なる牌を等しくないと判定する", () => {
  expect(Tile.equals(Tile.parse("1m") as Tile, Tile.parse("2m") as Tile)).toBe(false);
  expect(Tile.equals(Tile.parse("1m") as Tile, Tile.parse("1p") as Tile)).toBe(false);
});

test("equalsは数牌と字牌を等しくないと判定する", () => {
  expect(Tile.equals(Tile.parse("1m") as Tile, Tile.parse("ton") as Tile)).toBe(false);
});

test("strictEqualsは赤5と通常の5を区別する", () => {
  const red5m = Tile.parse("0m") as Tile;
  const normal5m = Tile.parse("5m") as Tile;
  expect(Tile.strictEquals(red5m, normal5m)).toBe(false);
});

test("strictEqualsは同一の牌同士は等しいと判定する", () => {
  expect(Tile.strictEquals(Tile.parse("haku") as Tile, Tile.parse("haku") as Tile)).toBe(true);
});
