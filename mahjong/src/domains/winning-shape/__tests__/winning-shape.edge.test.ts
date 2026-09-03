import { test, expect } from "vitest";

import { Hand } from "@/src/domains/hand";
import type { Tile } from "@/src/domains/tile";

import { WinningShape } from "..";

const invalidHand = (): never => {
  throw new Error("invalid hand for test");
};

const hand = (tiles: readonly Tile[]): Hand => {
  return Hand.create(tiles, []) ?? invalidHand();
};

test("和了形になっていない手の解釈は空になる", () => {
  expect(
    WinningShape.enumerate(hand(["1m", "2m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]), "5m", "ron"),
  ).toStrictEqual([]);
});

test("和了牌が手牌に含まれていなければ解釈は空になる", () => {
  expect(
    WinningShape.enumerate(hand(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]), "9m", "ron"),
  ).toStrictEqual([]);
});

test("同じ牌4枚は七対子の対子2組として扱われない", () => {
  expect(
    WinningShape.enumerate(hand(["1m", "1m", "1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "ton", "ton"]), "ton", "ron"),
  ).toStrictEqual([]);
});

test("么九牌が1種でも欠けていれば国士無双にならない", () => {
  expect(
    WinningShape.enumerate(hand(["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "1m", "1m"]), "1m", "ron"),
  ).toStrictEqual([]);
});

test("14枚相当でない枚数は和了形と判定されない", () => {
  expect(WinningShape.isWinning(["1m", "2m", "3m"], 0)).toBe(false);
  expect(WinningShape.isWinning(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], 1)).toBe(false);
});

test("4枚使い切った牌は待ちに含まれない", () => {
  const waits = WinningShape.waits(["1m", "1m", "1m", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton"], 0);
  expect(waits).not.toContain("1m");
  expect(waits).toContain("ton");
});

test("13枚相当でない枚数の待ちは空になる", () => {
  expect(WinningShape.waits(["1m", "2m"], 0)).toStrictEqual([]);
});
