import { test, expect } from "vitest";

import { Meld } from "@/src/domains/meld";

import { Hand } from "..";

const pon = (tile: "1m" | "haku") => Meld.create("pon", [tile, tile, tile])!;

test("純手牌14枚・副露なしの手牌を生成できる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
    [],
  );
  expect(hand?.tiles).toHaveLength(14);
  expect(hand && Hand.isMenzen(hand)).toBe(true);
});

test("副露1つにつき純手牌は3枚少なくなる", () => {
  const hand = Hand.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m"], [pon("haku")]);
  expect(hand).toBeDefined();
  expect(hand && Hand.isMenzen(hand)).toBe(false);
  expect(hand && Hand.allTiles(hand)).toHaveLength(14);
});

test("暗槓のみの手牌は門前として扱われる", () => {
  const ankan = Meld.create("ankan", ["9s", "9s", "9s", "9s"])!;
  const hand = Hand.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9p", "5m", "5m"], [ankan]);
  expect(hand && Hand.isMenzen(hand)).toBe(true);
});

test("赤5は副露を含めて枚数が数えられる", () => {
  const hand = Hand.create(["0m", "5m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "2p"], []);
  expect(hand && Hand.redCount(hand)).toBe(1);
  expect(hand && Hand.countOf(hand, "5m")).toBe(2);
});

test("手牌は生成時に種類順へ整列される", () => {
  const hand = Hand.create(["chun", "1m", "9s", "1m", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "chun", "chun"], []);
  expect(hand?.tiles[0]).toBe("1m");
  expect(hand?.tiles[13]).toBe("chun");
  expect(hand && Hand.contains(hand, "9s")).toBe(true);
  expect(hand && Hand.contains(hand, "9p")).toBe(false);
});

test("副露を含めて同種牌を数えられる", () => {
  const hand = Hand.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m"], [pon("1m")]);
  expect(hand && Hand.countOf(hand, "1m")).toBe(4);
});
