import { test, expect } from "vitest";

import { Meld } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const tiles = (...texts: readonly string[]): Tile[] =>
  texts.flatMap((text) => {
    const tile = Tile.parse(text);
    return tile === null ? [] : [tile];
  });

test("チーは同色の連続する3牌で成立する", () => {
  expect(Meld.create("chi", tiles("3m", "1m", "2m"))).not.toBeNull();
});

test("連続しない牌のチーは不成立", () => {
  expect(Meld.create("chi", tiles("1m", "2m", "4m"))).toBeNull();
});

test("字牌のチーは不成立", () => {
  expect(Meld.create("chi", tiles("ton", "nan", "sha"))).toBeNull();
});

test("ポンは同種3牌で成立し赤5も同種として扱う", () => {
  expect(Meld.create("pon", tiles("5p", "5p", "0p"))).not.toBeNull();
  expect(Meld.create("pon", tiles("5p", "5p", "6p"))).toBeNull();
});

test("カン・暗槓は同種4牌で成立する", () => {
  expect(Meld.create("kan", tiles("1s", "1s", "1s", "1s"))).not.toBeNull();
  expect(Meld.create("ankan", tiles("ton", "ton", "ton", "ton"))).not.toBeNull();
  expect(Meld.create("kan", tiles("1s", "1s", "1s"))).toBeNull();
});

test("暗槓は門前を崩さない副露として扱う", () => {
  const ankan = Meld.create("ankan", tiles("1s", "1s", "1s", "1s"));
  const pon = Meld.create("pon", tiles("5p", "5p", "5p"));
  expect(ankan !== null && Meld.isOpen(ankan)).toBe(false);
  expect(pon !== null && Meld.isOpen(pon)).toBe(true);
});
