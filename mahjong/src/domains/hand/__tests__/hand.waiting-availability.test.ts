import { test, expect } from "vitest";

import { Tile } from "../../tile/index.ts";
import type { Tile as TileType } from "../../tile/index.ts";
import { Hand } from "../index.ts";

const tiles = (...values: readonly string[]): readonly TileType[] =>
  values.map((value) => Tile.parse(value) as TileType);

test("同種牌を4枚すべて使っている手は存在しない5枚目を待ち牌に含めない", () => {
  const hand = tiles(
    "1m", "1m", "1m", "1m",
    "2p", "3p", "4p",
    "5s", "6s", "7s",
    "ton", "ton", "ton",
  );

  expect(Hand.waitingTiles(hand, []).map(Tile.format)).not.toContain("1m");
  expect(Hand.isTenpai(hand, [])).toBe(false);
});
