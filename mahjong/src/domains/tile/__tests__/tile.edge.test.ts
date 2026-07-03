import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("不正な牌表記は解析できない", () => {
  expect(Tile.parse("")).toBeNull();
  expect(Tile.parse("10m")).toBeNull();
  expect(Tile.parse("5x")).toBeNull();
  expect(Tile.parse("0z")).toBeNull();
  expect(Tile.parse("TON")).toBeNull();
  expect(Tile.parse("tonn")).toBeNull();
});
