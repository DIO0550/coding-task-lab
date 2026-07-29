import { expect, test } from "vitest";

import { Meld } from "../../meld/index.ts";
import { Tile } from "../../tile/index.ts";
import { Hand } from "../index.ts";

const tiles = (codes: string): readonly Tile[] =>
  Tile.fromCodes(codes.split(" ")) ?? [];

const handOf = (codes: string): ReturnType<typeof Hand.create> =>
  Hand.create(tiles(codes));

test("順子3つと刻子1つと雀頭の手は和了形と判定される", () => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  expect(Hand.isWinningShape(hand)).toBe(true);
});

test("面子が揃っていない手は和了形と判定されない", () => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton nan sha 5m 5m");
  expect(Hand.isWinningShape(hand)).toBe(false);
});

test("七対子は和了形と判定される", () => {
  const hand = handOf("1m 1m 3m 3m 5p 5p 9p 9p 2s 2s ton ton chun chun");
  expect(Hand.isWinningShape(hand)).toBe(true);
});

test("国士無双は和了形と判定される", () => {
  const hand = handOf(
    "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun chun",
  );
  expect(Hand.isWinningShape(hand)).toBe(true);
});

test("副露を含む手も和了形と判定される", () => {
  const hand = Hand.create(tiles("2m 3m 4m 5p 6p 7p 9s 9s 9s 1m 1m"), [
    Meld.pon(tiles("chun chun chun"), 2),
  ]);
  expect(Hand.isWinningShape(hand)).toBe(true);
});

test("和了形の手のシャンテン数は -1 になる", () => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  expect(Hand.shanten(hand)).toBe(-1);
});

test("テンパイの手のシャンテン数は 0 になる", () => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m");
  expect(Hand.shanten(hand)).toBe(0);
});

test("両面待ちのテンパイでは和了牌が2種類になる", () => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton 5m 6m");
  expect(Hand.waits(hand).map((tile) => Tile.toCode(tile))).toStrictEqual([
    "4m",
    "7m",
  ]);
});

test("国士無双13面待ちでは和了牌が13種類になる", () => {
  const hand = handOf("1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun");
  expect(Hand.waits(hand)).toHaveLength(13);
});

test("副露した手は門前ではなくなる", () => {
  const hand = Hand.create(tiles("2m 3m 4m 5p 6p 7p 9s 9s 9s 1m 1m"), [
    Meld.pon(tiles("chun chun chun"), 2),
  ]);
  expect(Hand.isMenzen(hand)).toBe(false);
});

test("暗槓のみの手は門前のままになる", () => {
  const hand = Hand.create(tiles("2m 3m 4m 5p 6p 7p 9s 9s 9s 1m 1m"), [
    Meld.ankan(tiles("chun chun chun chun")),
  ]);
  expect(Hand.isMenzen(hand)).toBe(true);
});

test("三色にも一気通貫にも解釈できる手は複数の和了形を持つ", () => {
  const hand = handOf("1m 1m 1m 2m 2m 2m 3m 3m 3m 4m 5m 6m 9m 9m");
  expect(Hand.winningForms(hand).length).toBeGreaterThan(1);
});

test("ポンできる牌は手牌から2枚が使われる", () => {
  const hand = handOf("5m 5m 5m 2p 3p 4p 7s 8s 9s ton ton nan sha");
  const used = Hand.ponTiles(hand, Tile.fromCode("5m") ?? tiles("1m")[0]);
  expect(used).toHaveLength(2);
});

test("チーできる牌は複数の組み合わせを返す", () => {
  const hand = handOf("3m 4m 6m 7m 2p 3p 4p 7s 8s 9s ton ton nan");
  const candidates = Hand.chiTiles(hand, Tile.fromCode("5m") ?? tiles("1m")[0]);
  expect(candidates).toHaveLength(3);
});

test("同じ牌が4枚あれば暗槓できる", () => {
  const hand = handOf("5m 5m 5m 5m 2p 3p 4p 7s 8s 9s ton ton nan sha");
  expect(Hand.ankanTiles(hand).map((tile) => Tile.toCode(tile))).toStrictEqual([
    "5m",
  ]);
});
