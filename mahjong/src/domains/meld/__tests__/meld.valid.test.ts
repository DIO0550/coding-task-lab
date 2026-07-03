import { test, expect } from "vitest";

import { Meld } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly Tile[] =>
  ss.map((s) => Tile.parse(s) as Tile);

test("チーは同色の数牌が3連続していれば有効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("1m", "2m", "3m") })).toBe(true);
});

test("チーは赤5を含んでいても連続していれば有効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("4m", "0m", "6m") })).toBe(true);
});

test("チーは赤5を含んでいても連続していなければ無効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("3m", "0m", "6m") })).toBe(false);
});

test("チーは並び順が入れ替わっていても連続していれば有効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("3m", "1m", "2m") })).toBe(true);
});

test("チーは色が異なると無効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("1m", "2p", "3s") })).toBe(false);
});

test("チーは数字が飛んでいると無効(135のような順子は不可)", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("1m", "3m", "5m") })).toBe(false);
});

test("チーは字牌を含むと無効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("1m", "2m", "ton") })).toBe(false);
});

test("チーは3枚でないと無効", () => {
  expect(Meld.isValid({ type: "chi", tiles: tiles("1m", "2m") })).toBe(false);
});

test("ポンは同種の牌が3枚であれば有効", () => {
  expect(Meld.isValid({ type: "pon", tiles: tiles("5p", "5p", "5p") })).toBe(true);
});

test("ポンは赤5を含んでいても同種として有効", () => {
  expect(Meld.isValid({ type: "pon", tiles: tiles("5p", "0p", "5p") })).toBe(true);
});

test("ポンは種類の異なる牌が混ざると無効", () => {
  expect(Meld.isValid({ type: "pon", tiles: tiles("5p", "5p", "6p") })).toBe(false);
});

test("ポンは字牌でも同種3枚であれば有効", () => {
  expect(Meld.isValid({ type: "pon", tiles: tiles("haku", "haku", "haku") })).toBe(true);
});

test("明槓は同種の牌が4枚であれば有効", () => {
  expect(Meld.isValid({ type: "kan", tiles: tiles("9s", "9s", "9s", "9s") })).toBe(true);
});

test("暗槓は同種の牌が4枚であれば有効", () => {
  expect(Meld.isValid({ type: "ankan", tiles: tiles("ton", "ton", "ton", "ton") })).toBe(true);
});

test("槓は3枚以下だと無効", () => {
  expect(Meld.isValid({ type: "kan", tiles: tiles("9s", "9s", "9s") })).toBe(false);
});

test("槓は種類の異なる牌が混ざると無効", () => {
  expect(Meld.isValid({ type: "ankan", tiles: tiles("9s", "9s", "9s", "8s") })).toBe(false);
});
