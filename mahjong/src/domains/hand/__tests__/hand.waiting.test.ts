import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);
const format = (ts: readonly TileT[]): readonly string[] => ts.map(Tile.format);

test("両面待ちのwaitingTilesは両側の牌を返す", () => {
  const concealed13 = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "ton", "ton",
    "5s", "6s",
    "7s", "8s", "9s",
  );
  const result = Hand.waitingTiles(concealed13, []);
  expect(format(result)).toStrictEqual(["4s", "7s"]);
});

test("九蓮宝燈のテンパイ形のwaitingTilesは1から9まで全ての牌を返す(多面張)", () => {
  const concealed13 = tiles(
    "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "9m", "9m",
  );
  const result = Hand.waitingTiles(concealed13, []);
  expect(format(result)).toStrictEqual([
    "1m",
    "2m",
    "3m",
    "4m",
    "5m",
    "6m",
    "7m",
    "8m",
    "9m",
  ]);
});

test("么九牌13種を単独で持つテンパイ形のwaitingTilesは国士無双の13面待ちになる", () => {
  const concealed13 = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu", "chun",
  );
  const result = Hand.waitingTiles(concealed13, []);
  expect(format(result)).toStrictEqual([
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",
    "ton",
    "nan",
    "sha",
    "pei",
    "haku",
    "hatsu",
    "chun",
  ]);
});

test("和了形でないノーテンの手牌はwaitingTilesが空配列になる", () => {
  const concealed13 = tiles(
    "1m", "3m", "5m",
    "2p", "4p", "6p",
    "1s", "3s", "5s",
    "ton", "nan", "sha",
    "haku",
  );
  expect(Hand.waitingTiles(concealed13, [])).toStrictEqual([]);
});
