import { expect, test } from "vitest";

import { Tile } from "../index.ts";

test.each(["", "10m", "1z", "x", "5", "ton1", "0z"])(
  "不正な牌表記 %s は null になる",
  (code) => {
    expect(Tile.fromCode(code)).toBeNull();
  },
);

test("1つでも不正な牌表記が含まれる配列は null になる", () => {
  expect(Tile.fromCodes(["1m", "20p"])).toBeNull();
});

test("字牌に赤は存在しないため不正な牌と判定される", () => {
  expect(Tile.isValid({ suit: "honor", rank: 5, red: true })).toBe(false);
});

test("字牌の rank は7までのため8は不正な牌と判定される", () => {
  expect(Tile.isValid({ suit: "honor", rank: 8, red: false })).toBe(false);
});

test("索子の5以外に赤は存在しないため不正な牌と判定される", () => {
  expect(Tile.isValid({ suit: "sou", rank: 4, red: true })).toBe(false);
});

test("34種すべての牌種を列挙できる", () => {
  expect(Tile.allKinds()).toHaveLength(34);
});
