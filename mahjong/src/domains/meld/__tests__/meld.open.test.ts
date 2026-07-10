import { test, expect } from "vitest";

import { Meld } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly Tile[] =>
  ss.map((s) => Tile.parse(s) as Tile);

test("チー・ポン・明槓はopenがtrueになる", () => {
  expect(Meld.isOpen({ type: "chi", tiles: tiles("1m", "2m", "3m") })).toBe(true);
  expect(Meld.isOpen({ type: "pon", tiles: tiles("5p", "5p", "5p") })).toBe(true);
  expect(Meld.isOpen({ type: "kan", tiles: tiles("9s", "9s", "9s", "9s") })).toBe(true);
});

test("暗槓はopenがfalseになる", () => {
  expect(Meld.isOpen({ type: "ankan", tiles: tiles("9s", "9s", "9s", "9s") })).toBe(false);
});

test("isKanはkanとankanに対してtrueを返す", () => {
  expect(Meld.isKan({ type: "kan", tiles: tiles("9s", "9s", "9s", "9s") })).toBe(true);
  expect(Meld.isKan({ type: "ankan", tiles: tiles("9s", "9s", "9s", "9s") })).toBe(true);
});

test("isKanはchiとponに対してfalseを返す", () => {
  expect(Meld.isKan({ type: "chi", tiles: tiles("1m", "2m", "3m") })).toBe(false);
  expect(Meld.isKan({ type: "pon", tiles: tiles("5p", "5p", "5p") })).toBe(false);
});
