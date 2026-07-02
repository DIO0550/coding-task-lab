import { test, expect } from "vitest";

import { Tile } from "../index.ts";

const indexOf = (text: string): number => {
  const tile = Tile.parse(text);
  if (tile === null) {
    throw new Error(`不正な牌表記: ${text}`);
  }
  return Tile.index(tile);
};

test("1・9の数牌は老頭牌かつ么九牌になる", () => {
  expect(Tile.isTerminal(indexOf("1m"))).toBe(true);
  expect(Tile.isTerminal(indexOf("9s"))).toBe(true);
  expect(Tile.isYaochuu(indexOf("9s"))).toBe(true);
  expect(Tile.isTerminal(indexOf("5p"))).toBe(false);
});

test("字牌は么九牌だが老頭牌ではない", () => {
  expect(Tile.isHonor(indexOf("haku"))).toBe(true);
  expect(Tile.isYaochuu(indexOf("haku"))).toBe(true);
  expect(Tile.isTerminal(indexOf("haku"))).toBe(false);
});

test("2〜8の数牌は中張牌になる", () => {
  expect(Tile.isSimple(indexOf("2m"))).toBe(true);
  expect(Tile.isSimple(indexOf("8s"))).toBe(true);
  expect(Tile.isSimple(indexOf("1p"))).toBe(false);
  expect(Tile.isSimple(indexOf("ton"))).toBe(false);
});

test("緑一色の構成牌は2s3s4s6s8sと發のみになる", () => {
  for (const green of ["2s", "3s", "4s", "6s", "8s", "hatsu"]) {
    expect(Tile.isGreen(indexOf(green))).toBe(true);
  }
  for (const notGreen of ["1s", "5s", "7s", "9s", "2m", "haku"]) {
    expect(Tile.isGreen(indexOf(notGreen))).toBe(false);
  }
});

test("風はそれぞれ対応する字牌の牌種になる", () => {
  expect(Tile.windIndex("ton")).toBe(indexOf("ton"));
  expect(Tile.windIndex("pei")).toBe(indexOf("pei"));
});
