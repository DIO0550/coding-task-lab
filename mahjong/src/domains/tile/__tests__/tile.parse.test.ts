import { expect, test } from "vitest";
import { Tile } from "../index.ts";

test("数牌表記はスートとランクを持つ牌として解釈される", () => {
  expect(Tile.parse("1m")).toStrictEqual({ suit: "m", rank: 1, red: false });
  expect(Tile.parse("5p")).toStrictEqual({ suit: "p", rank: 5, red: false });
  expect(Tile.parse("9s")).toStrictEqual({ suit: "s", rank: 9, red: false });
});

test("赤5表記(0m/0p/0s)はランク5の赤牌として解釈される", () => {
  expect(Tile.parse("0m")).toStrictEqual({ suit: "m", rank: 5, red: true });
  expect(Tile.parse("0p")).toStrictEqual({ suit: "p", rank: 5, red: true });
  expect(Tile.parse("0s")).toStrictEqual({ suit: "s", rank: 5, red: true });
});

test("字牌表記は東南西北白發中の順にランク1〜7の字牌として解釈される", () => {
  expect(Tile.parse("ton")).toStrictEqual({ suit: "z", rank: 1, red: false });
  expect(Tile.parse("nan")).toStrictEqual({ suit: "z", rank: 2, red: false });
  expect(Tile.parse("sha")).toStrictEqual({ suit: "z", rank: 3, red: false });
  expect(Tile.parse("pei")).toStrictEqual({ suit: "z", rank: 4, red: false });
  expect(Tile.parse("haku")).toStrictEqual({ suit: "z", rank: 5, red: false });
  expect(Tile.parse("hatsu")).toStrictEqual({ suit: "z", rank: 6, red: false });
  expect(Tile.parse("chun")).toStrictEqual({ suit: "z", rank: 7, red: false });
});

test("不正な牌表記はnullになる", () => {
  expect(Tile.parse("")).toBeNull();
  expect(Tile.parse("10m")).toBeNull();
  expect(Tile.parse("5x")).toBeNull();
  expect(Tile.parse("0z")).toBeNull();
  expect(Tile.parse("m5")).toBeNull();
  expect(Tile.parse("TON")).toBeNull();
  expect(Tile.parse(" 5m")).toBeNull();
});

test("全34種の牌は表記との往復変換で元の牌に戻る", () => {
  for (const tile of Tile.all()) {
    expect(Tile.parse(Tile.toNotation(tile))).toStrictEqual(tile);
  }
});

test("赤5の表記は0m/0p/0sになる", () => {
  const redFive = Tile.parse("0p");
  expect(redFive).not.toBeNull();
  expect(Tile.toNotation(redFive!)).toBe("0p");
});

test("通常の数牌の表記はランク+スートになる", () => {
  const tile = Tile.parse("7s");
  expect(Tile.toNotation(tile!)).toBe("7s");
});

test("字牌の表記はton等の名前になる", () => {
  const tile = Tile.parse("chun");
  expect(Tile.toNotation(tile!)).toBe("chun");
});

test("正準キーは赤を無視してスートとランクで決まる", () => {
  expect(Tile.key(Tile.parse("0m")!)).toBe("m5");
  expect(Tile.key(Tile.parse("5m")!)).toBe("m5");
  expect(Tile.key(Tile.parse("ton")!)).toBe("z1");
});
