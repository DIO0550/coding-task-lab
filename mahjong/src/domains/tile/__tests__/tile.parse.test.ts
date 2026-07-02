import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("数牌の表記をパースできる", () => {
  expect(Tile.parse("1m")).toStrictEqual({ suit: "m", rank: 1, red: false });
  expect(Tile.parse("9s")).toStrictEqual({ suit: "s", rank: 9, red: false });
});

test("赤5の表記(0m/0p/0s)は赤フラグ付きの5としてパースされる", () => {
  expect(Tile.parse("0p")).toStrictEqual({ suit: "p", rank: 5, red: true });
});

test("字牌の表記をパースできる", () => {
  expect(Tile.parse("ton")).toStrictEqual({ suit: "z", rank: 1, red: false });
  expect(Tile.parse("chun")).toStrictEqual({ suit: "z", rank: 7, red: false });
});

test("存在しない表記は null になる", () => {
  expect(Tile.parse("10m")).toBeNull();
  expect(Tile.parse("5z")).toBeNull();
  expect(Tile.parse("x")).toBeNull();
  expect(Tile.parse("")).toBeNull();
});

test("パースした牌は元の表記に戻せる", () => {
  for (const text of ["3m", "0s", "9p", "ton", "hatsu"]) {
    const tile = Tile.parse(text);
    expect(tile).not.toBeNull();
    expect(Tile.format(tile as NonNullable<typeof tile>)).toBe(text);
  }
});

test("赤5は通常の5と同種として扱われる", () => {
  const red = Tile.parse("0m");
  const normal = Tile.parse("5m");
  expect(red).not.toBeNull();
  expect(normal).not.toBeNull();
  expect(
    Tile.equalsKind(
      red as NonNullable<typeof red>,
      normal as NonNullable<typeof normal>,
    ),
  ).toBe(true);
});
