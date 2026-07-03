import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

test("7種類の対子が揃った14枚は七対子として成立する", () => {
  const concealed = tiles(
    "1m", "1m",
    "9m", "9m",
    "1p", "1p",
    "9p", "9p",
    "1s", "1s",
    "9s", "9s",
    "haku", "haku",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("haku") as TileT,
    winType: "ron",
  });

  const chiitoi = result.find((d) => d.kind === "chiitoitsu");
  expect(chiitoi).toBeDefined();
  if (chiitoi?.kind !== "chiitoitsu") {
    throw new Error("chiitoitsu decomposition が得られなかった");
  }
  expect(chiitoi.pairs).toHaveLength(7);
});

test("同一牌4枚使いは七対子として成立しない", () => {
  const concealed = tiles(
    "1m", "1m", "1m", "1m",
    "2m", "2m",
    "3m", "3m",
    "4m", "4m",
    "5m", "5m",
    "6m", "6m",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("6m") as TileT,
    winType: "ron",
  });

  expect(result.some((d) => d.kind === "chiitoitsu")).toBe(false);
});

test("副露がある場合は七対子として成立しない", () => {
  const concealed = tiles(
    "1m", "1m",
    "9m", "9m",
    "1p", "1p",
    "9p", "9p",
    "1s", "1s",
    "haku",
  );
  const result = Hand.decompose({
    concealed,
    melds: [{ type: "pon", tiles: tiles("9s", "9s", "9s") }],
    winTile: Tile.parse("haku") as TileT,
    winType: "ron",
  });

  expect(result.some((d) => d.kind === "chiitoitsu")).toBe(false);
});
