import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

test("么九牌13種を単騎で揃えて対子になった牌で和了ると国士無双13面待ちになる", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu", "chun",
    "chun",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("chun") as TileT,
    winType: "ron",
  });

  const kokushi = result.find((d) => d.kind === "kokushi");
  expect(kokushi).toBeDefined();
  if (kokushi?.kind !== "kokushi") {
    throw new Error("kokushi decomposition が得られなかった");
  }
  expect(kokushi.thirteenWait).toBe(true);
});

test("么九牌の対子が和了牌と異なる場合は国士無双の単騎待ちにならない(13面待ちではない)", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "ton", "nan", "sha", "pei", "haku", "hatsu",
    "chun",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("chun") as TileT,
    winType: "ron",
  });

  const kokushi = result.find((d) => d.kind === "kokushi");
  expect(kokushi).toBeDefined();
  if (kokushi?.kind !== "kokushi") {
    throw new Error("kokushi decomposition が得られなかった");
  }
  expect(kokushi.thirteenWait).toBe(false);
});

test("么九牌が1種類でも欠けていると国士無双は成立しない", () => {
  // chun が欠けており、代わりに ton・nan が2枚ずつになっている(么九牌のみ・14枚)
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "ton", "nan", "nan", "sha", "pei", "haku", "hatsu",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("hatsu") as TileT,
    winType: "ron",
  });

  expect(result.some((d) => d.kind === "kokushi")).toBe(false);
});
