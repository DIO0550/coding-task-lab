import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

test("和了形でない手牌はdecomposeが空配列になる", () => {
  const concealed = tiles(
    "1m", "3m", "5m",
    "2p", "4p", "6p",
    "1s", "3s", "5s",
    "ton", "nan", "sha",
    "haku", "hatsu",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("haku") as TileT,
    winType: "ron",
  });

  expect(result).toStrictEqual([]);
});

test("和了形でない手牌はisWinningがfalseになる", () => {
  const concealed = tiles(
    "1m", "3m", "5m",
    "2p", "4p", "6p",
    "1s", "3s", "5s",
    "ton", "nan", "sha",
    "haku", "hatsu",
  );
  expect(
    Hand.isWinning({ concealed, melds: [], winTile: Tile.parse("haku") as TileT, winType: "ron" }),
  ).toBe(false);
});

test("和了牌が手牌に含まれていない場合はdecomposeが空配列になる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("chun") as TileT,
    winType: "ron",
  });

  expect(result).toStrictEqual([]);
});

test("和了形の手牌はisWinningがtrueになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  expect(
    Hand.isWinning({ concealed, melds: [], winTile: Tile.parse("ton") as TileT, winType: "ron" }),
  ).toBe(true);
});
