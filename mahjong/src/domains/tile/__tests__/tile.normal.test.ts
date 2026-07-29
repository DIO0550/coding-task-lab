import { expect, test } from "vitest";

import { Tile } from "../index.ts";

test("萬子の牌表記から牌を生成できる", () => {
  expect(Tile.fromCode("3m")).toStrictEqual({
    suit: "man",
    rank: 3,
    red: false,
  });
});

test("字牌の牌表記から牌を生成できる", () => {
  expect(Tile.fromCode("hatsu")).toStrictEqual({
    suit: "honor",
    rank: 6,
    red: false,
  });
});

test("赤5は rank 5 の赤牌として生成される", () => {
  expect(Tile.fromCode("0p")).toStrictEqual({
    suit: "pin",
    rank: 5,
    red: true,
  });
});

test("赤5は牌表記へ戻すと 0 表記になる", () => {
  expect(Tile.toCode({ suit: "sou", rank: 5, red: true })).toBe("0s");
});

test("赤5と通常の5は同じ牌種として扱われる", () => {
  const red = Tile.fromCode("0m");
  const normal = Tile.fromCode("5m");
  expect(Tile.isSameKind(red ?? normal!, normal!)).toBe(true);
});

test.each([
  ["1m", 0],
  ["9m", 8],
  ["1p", 9],
  ["1s", 18],
  ["ton", 27],
  ["chun", 33],
])("%s の牌種インデックスは %i になる", (code, index) => {
  expect(Tile.toIndex(Tile.fromCode(code)!)).toBe(index);
});

test.each([
  ["1m", "2m"],
  ["9m", "1m"],
  ["5p", "6p"],
  ["pei", "ton"],
  ["chun", "haku"],
  ["haku", "hatsu"],
])("ドラ表示牌 %s のドラは %s になる", (indicator, dora) => {
  expect(Tile.toCode(Tile.doraFromIndicator(Tile.fromCode(indicator)!))).toBe(
    dora,
  );
});

test("牌は萬子・筒子・索子・字牌の順に並び替えられる", () => {
  const tiles = Tile.fromCodes(["chun", "1s", "5p", "2m"]) ?? [];
  expect(Tile.sort(tiles).map((tile) => Tile.toCode(tile))).toStrictEqual([
    "2m",
    "5p",
    "1s",
    "chun",
  ]);
});

test("么九牌は1・9・字牌が該当する", () => {
  const orphans = Tile.fromCodes(["1m", "9s", "ton", "haku"]) ?? [];
  expect(orphans.every((tile) => Tile.isOrphan(tile))).toBe(true);
});

test("中張牌は2〜8の数牌が該当する", () => {
  const simples = Tile.fromCodes(["2m", "5p", "8s"]) ?? [];
  expect(simples.every((tile) => Tile.isSimple(tile))).toBe(true);
});

test("緑一色の構成牌は索子の2/3/4/6/8と發になる", () => {
  const greens = Tile.fromCodes(["2s", "3s", "4s", "6s", "8s", "hatsu"]) ?? [];
  expect(greens.every((tile) => Tile.isGreen(tile))).toBe(true);
});
