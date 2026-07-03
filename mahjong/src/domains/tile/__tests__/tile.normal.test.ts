import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("数牌の表記を解析できる", () => {
  expect(Tile.parse("5m")).toStrictEqual({ suit: "m", rank: 5, red: false });
  expect(Tile.parse("1p")).toStrictEqual({ suit: "p", rank: 1, red: false });
  expect(Tile.parse("9s")).toStrictEqual({ suit: "s", rank: 9, red: false });
});

test("字牌の表記を解析できる", () => {
  expect(Tile.parse("ton")).toStrictEqual({ suit: "z", rank: 1, red: false });
  expect(Tile.parse("chun")).toStrictEqual({ suit: "z", rank: 7, red: false });
});

test("赤5は 0m/0p/0s として5の赤牌になる", () => {
  expect(Tile.parse("0p")).toStrictEqual({ suit: "p", rank: 5, red: true });
});

test("牌を表記文字列に戻せる", () => {
  const five = Tile.parse("5m");
  const red = Tile.parse("0s");
  const honor = Tile.parse("hatsu");
  expect(five === null ? "" : Tile.format(five)).toBe("5m");
  expect(red === null ? "" : Tile.format(red)).toBe("0s");
  expect(honor === null ? "" : Tile.format(honor)).toBe("hatsu");
});

test("么九牌は字牌と1・9の数牌", () => {
  expect(Tile.isYaochuu({ suit: "m", rank: 1, red: false })).toBe(true);
  expect(Tile.isYaochuu({ suit: "s", rank: 9, red: false })).toBe(true);
  expect(Tile.isYaochuu({ suit: "z", rank: 5, red: false })).toBe(true);
  expect(Tile.isYaochuu({ suit: "p", rank: 5, red: false })).toBe(false);
});

test("緑一色を構成できる牌は索子23468と發", () => {
  const greens = ["2s", "3s", "4s", "6s", "8s", "hatsu"];
  for (const text of greens) {
    const tile = Tile.parse(text);
    expect(tile !== null && Tile.isGreen(tile)).toBe(true);
  }
  const five = Tile.parse("5s");
  const chun = Tile.parse("chun");
  expect(five !== null && Tile.isGreen(five)).toBe(false);
  expect(chun !== null && Tile.isGreen(chun)).toBe(false);
});

test("枚数配列は牌種ごとの枚数を数える", () => {
  const tiles = ["1m", "1m", "9s", "chun"].flatMap((text) => {
    const tile = Tile.parse(text);
    return tile === null ? [] : [tile];
  });
  const counts = Tile.countsOf(tiles);
  expect(counts[0]).toBe(2);
  expect(counts[26]).toBe(1);
  expect(counts[33]).toBe(1);
  expect(counts.reduce((a, b) => a + b, 0)).toBe(4);
});

test("赤5と通常の5は同じ牌種になる", () => {
  const red = Tile.parse("0m");
  const normal = Tile.parse("5m");
  expect(red !== null && normal !== null && Tile.equalsKind(red, normal)).toBe(true);
});
