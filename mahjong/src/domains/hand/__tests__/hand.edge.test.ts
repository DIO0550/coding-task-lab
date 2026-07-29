import { expect, test } from "vitest";

import { Meld } from "../../meld/index.ts";
import { Tile } from "../../tile/index.ts";
import { Hand } from "../index.ts";

const tiles = (codes: string): readonly Tile[] =>
  Tile.fromCodes(codes.split(" ")) ?? [];

test("同じ牌4枚を2組の対子とみなす七対子は成立しない", () => {
  const hand = Hand.create(
    tiles("1m 1m 1m 1m 3m 3m 5p 5p 9p 9p 2s 2s ton ton"),
  );
  expect(
    Hand.winningForms(hand).some((form) => form.kind === "seven_pairs"),
  ).toBe(false);
});

test("副露がある手では七対子は成立しない", () => {
  const hand = Hand.create(tiles("1m 1m 3m 3m 5p 5p 9p 9p 2s 2s ton"), [
    Meld.pon(tiles("chun chun chun"), 1),
  ]);
  expect(Hand.isWinningShape(hand)).toBe(false);
});

test("么九牌が1種類欠けた手は国士無双にならない", () => {
  const hand = Hand.create(
    tiles("1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu 2m 2m"),
  );
  expect(Hand.isWinningShape(hand)).toBe(false);
});

test("国士無双単騎待ちでは和了牌が1種類になる", () => {
  const hand = Hand.create(
    tiles("1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu"),
  );
  expect(Hand.waits(hand).map((tile) => Tile.toCode(tile))).toStrictEqual([
    "chun",
  ]);
});

test("枚数が足りない手は和了形と判定されない", () => {
  const hand = Hand.create(tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m"));
  expect(Hand.isWinningShape(hand)).toBe(false);
});

test("色をまたぐ順子は成立しない", () => {
  const hand = Hand.create(
    tiles("8m 9m 1p 2p 3p 4p 5p 6p 7s 8s 9s ton ton ton"),
  );
  expect(Hand.isWinningShape(hand)).toBe(false);
});

test("配牌直後のばらばらな手は6シャンテン以上になる", () => {
  const hand = Hand.create(
    tiles("1m 4m 7m 2p 5p 8p 3s 6s 9s ton nan sha haku"),
  );
  expect(Hand.shanten(hand)).toBeGreaterThanOrEqual(6);
});

test("七対子1シャンテンの手は七対子として評価される", () => {
  const hand = Hand.create(
    tiles("1m 1m 3m 3m 5p 5p 9p 9p 2s 2s ton nan sha"),
  );
  expect(Hand.shanten(hand)).toBe(1);
});
