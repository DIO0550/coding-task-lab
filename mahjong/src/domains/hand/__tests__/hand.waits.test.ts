import { test, expect } from "vitest";

import { Hand } from "@/src/domains/hand";

test("単騎待ちの手の待ち牌は雀頭候補の1種になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "5s"],
    [],
  );
  expect(Hand.waits(hand)).toStrictEqual(["5s"]);
});

test("嵌張待ちの手の待ち牌は間の1種になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "5m", "7m", "1p", "2p", "3p", "7s", "8s", "9s", "ton", "ton"],
    [],
  );
  expect(Hand.waits(hand)).toStrictEqual(["6m"]);
});

test("3面待ちの手の待ち牌は3種すべて列挙される", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "5s", "5s", "1p", "2p", "3p"],
    [],
  );
  expect(Hand.waits(hand)).toStrictEqual(["3m", "6m", "9m"]);
});

test("ノーテンの手の待ち牌は空になる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "5s", "9s"],
    [],
  );
  expect(Hand.waits(hand)).toStrictEqual([]);
});

test("1シャンテンの手の受け入れ牌はシャンテン数が下がる牌のみ列挙される", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "2p", "5s", "9s"],
    [],
  );
  expect(Hand.improvingTiles(hand)).toStrictEqual(["3p", "5s", "9s"]);
});
