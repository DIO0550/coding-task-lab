import { expect, test } from "vitest";
import { Tile } from "../index.ts";

const tile = (notation: string) => {
  const parsed = Tile.parse(notation);
  if (parsed === null) {
    throw new Error(`不正な牌表記: ${notation}`);
  }
  return parsed;
};

test("字牌のみが字牌と判定される", () => {
  expect(Tile.isHonor(tile("ton"))).toBe(true);
  expect(Tile.isHonor(tile("chun"))).toBe(true);
  expect(Tile.isHonor(tile("1m"))).toBe(false);
  expect(Tile.isHonor(tile("9s"))).toBe(false);
});

test("数牌の1と9のみが老頭牌と判定され字牌は含まれない", () => {
  expect(Tile.isTerminal(tile("1m"))).toBe(true);
  expect(Tile.isTerminal(tile("9s"))).toBe(true);
  expect(Tile.isTerminal(tile("5m"))).toBe(false);
  expect(Tile.isTerminal(tile("ton"))).toBe(false);
});

test("幺九牌は数牌の1・9と字牌すべてが該当する", () => {
  expect(Tile.isYaochu(tile("1m"))).toBe(true);
  expect(Tile.isYaochu(tile("9p"))).toBe(true);
  expect(Tile.isYaochu(tile("ton"))).toBe(true);
  expect(Tile.isYaochu(tile("haku"))).toBe(true);
  expect(Tile.isYaochu(tile("2m"))).toBe(false);
  expect(Tile.isYaochu(tile("8s"))).toBe(false);
});

test("中張牌は数牌の2〜8のみが該当する", () => {
  expect(Tile.isSimple(tile("2m"))).toBe(true);
  expect(Tile.isSimple(tile("8s"))).toBe(true);
  expect(Tile.isSimple(tile("0p"))).toBe(true);
  expect(Tile.isSimple(tile("1m"))).toBe(false);
  expect(Tile.isSimple(tile("9p"))).toBe(false);
  expect(Tile.isSimple(tile("hatsu"))).toBe(false);
});

test("風牌は東南西北のみが該当する", () => {
  expect(Tile.isWind(tile("ton"))).toBe(true);
  expect(Tile.isWind(tile("nan"))).toBe(true);
  expect(Tile.isWind(tile("sha"))).toBe(true);
  expect(Tile.isWind(tile("pei"))).toBe(true);
  expect(Tile.isWind(tile("haku"))).toBe(false);
  expect(Tile.isWind(tile("1m"))).toBe(false);
});

test("三元牌は白發中のみが該当する", () => {
  expect(Tile.isDragon(tile("haku"))).toBe(true);
  expect(Tile.isDragon(tile("hatsu"))).toBe(true);
  expect(Tile.isDragon(tile("chun"))).toBe(true);
  expect(Tile.isDragon(tile("pei"))).toBe(false);
  expect(Tile.isDragon(tile("5m"))).toBe(false);
});

test("赤5のみが赤牌と判定される", () => {
  expect(Tile.isRed(tile("0m"))).toBe(true);
  expect(Tile.isRed(tile("5m"))).toBe(false);
});

test("牌の同一性判定は赤を無視する", () => {
  expect(Tile.equals(tile("0m"), tile("5m"))).toBe(true);
  expect(Tile.equals(tile("5m"), tile("5p"))).toBe(false);
  expect(Tile.equals(tile("ton"), tile("ton"))).toBe(true);
});

test("完全一致判定は赤も区別する", () => {
  expect(Tile.equalsExact(tile("0m"), tile("5m"))).toBe(false);
  expect(Tile.equalsExact(tile("0m"), tile("0m"))).toBe(true);
  expect(Tile.equalsExact(tile("5m"), tile("5m"))).toBe(true);
});
