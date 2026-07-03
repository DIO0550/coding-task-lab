import { test, expect } from "vitest";

import { Hand } from "@/src/domains/hand";

test("4面子1雀頭が完成した手のシャンテン数は-1になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s", "5s"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(-1);
});

test("和了牌待ちの13枚形のシャンテン数は0になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(0);
});

test("面子3つと塔子1つの手のシャンテン数は1になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "5s", "9s"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(1);
});

test("6対子と単騎1枚の手は七対子テンパイとしてシャンテン数0になる", () => {
  const hand = Hand.create(
    ["1m", "1m", "2p", "2p", "3s", "3s", "ton", "ton", "haku", "haku", "9m", "9m", "5s"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(0);
});

test("5対子の手は七対子の1シャンテンになる", () => {
  const hand = Hand.create(
    ["1m", "1m", "2p", "2p", "3s", "3s", "ton", "ton", "haku", "haku", "5m", "6m", "7m"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(1);
});

test("么九牌13種が1枚ずつ揃った手は国士無双テンパイとしてシャンテン数0になる", () => {
  const hand = Hand.create(
    ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(0);
});

test("么九牌11種と対子1つの手は国士無双の1シャンテンになる", () => {
  const hand = Hand.create(
    ["1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "5m"],
    [],
  );
  expect(Hand.shanten(hand)).toBe(1);
});

test("副露を含む手のシャンテン数は純手牌と副露を合わせて計算される", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "5p"],
    [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
  );
  expect(Hand.shanten(hand)).toBe(0);
});

test("副露を含む完成手のシャンテン数は-1になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "5p", "5p"],
    [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
  );
  expect(Hand.shanten(hand)).toBe(-1);
});

test("完成した手は和了形と判定される", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s", "5s"],
    [],
  );
  expect(Hand.isWinningShape(hand)).toBe(true);
});

test("テンパイの手はテンパイと判定され完成形とは判定されない", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s"],
    [],
  );
  expect(Hand.isTenpai(hand)).toBe(true);
  expect(Hand.isWinningShape(hand)).toBe(false);
});
