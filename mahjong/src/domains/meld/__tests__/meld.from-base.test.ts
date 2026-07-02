import { test, expect } from "vitest";

import { Meld } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const tile = (text: string) => {
  const parsed = Tile.parse(text);
  if (parsed === null) {
    throw new Error(`不正な牌表記: ${text}`);
  }
  return parsed;
};

test("基準牌からチーを組み立てると連続する3枚になる", () => {
  const meld = Meld.fromBase("chi", tile("3p"));
  expect(meld).not.toBeNull();
  expect(meld?.tiles.map(Tile.format)).toStrictEqual(["3p", "4p", "5p"]);
});

test("8以上の数牌や字牌を基準にしたチーは作れない", () => {
  expect(Meld.fromBase("chi", tile("8m"))).toBeNull();
  expect(Meld.fromBase("chi", tile("ton"))).toBeNull();
});

test("基準牌からポンとカンを組み立てると同種の3枚・4枚になる", () => {
  expect(
    Meld.fromBase("pon", tile("haku"))?.tiles.map(Tile.format),
  ).toStrictEqual(["haku", "haku", "haku"]);
  expect(
    Meld.fromBase("ankan", tile("9s"))?.tiles.map(Tile.format),
  ).toStrictEqual(["9s", "9s", "9s", "9s"]);
});

test("赤5を基準にすると赤1枚を含む副露になる", () => {
  const meld = Meld.fromBase("pon", tile("0m"));
  expect(meld?.tiles.map(Tile.format)).toStrictEqual(["0m", "5m", "5m"]);
});
