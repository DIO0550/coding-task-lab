import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("数牌の文字列をパースすると種類・数字・赤なしとして得られる", () => {
  expect(Tile.parse("3p")).toStrictEqual({ kind: "number", suit: "p", rank: 3, red: false });
});

test("赤5の文字列0mをパースすると赤フラグ付きの5mになる", () => {
  expect(Tile.parse("0m")).toStrictEqual({ kind: "number", suit: "m", rank: 5, red: true });
});

test("字牌の文字列をパースすると対応する honor 牌になる", () => {
  expect(Tile.parse("haku")).toStrictEqual({ kind: "honor", honor: "haku" });
});

test("不正な文字列をパースすると null になる", () => {
  expect(Tile.parse("10m")).toBeNull();
  expect(Tile.parse("1x")).toBeNull();
  expect(Tile.parse("")).toBeNull();
  expect(Tile.parse("east")).toBeNull();
});

test("数牌はparseとformatを往復すると同じ文字列に戻る", () => {
  const cases = ["1m", "5p", "9s", "4m", "7s"];
  for (const s of cases) {
    const tile = Tile.parse(s);
    expect(tile).not.toBeNull();
    expect(Tile.format(tile as Tile)).toBe(s);
  }
});

test("赤5はformatすると0m/0p/0sの形式に戻る", () => {
  expect(Tile.format({ kind: "number", suit: "s", rank: 5, red: true })).toBe("0s");
});

test("字牌はparseとformatを往復すると同じ文字列に戻る", () => {
  const cases = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"];
  for (const s of cases) {
    const tile = Tile.parse(s);
    expect(tile).not.toBeNull();
    expect(Tile.format(tile as Tile)).toBe(s);
  }
});
