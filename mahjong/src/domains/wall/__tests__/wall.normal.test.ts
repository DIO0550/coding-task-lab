import { test, expect } from "vitest";

import { Tile } from "@/src/domains/tile";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { Wall } from "..";

test("牌山は136枚で構成され、王牌14枚を除いた122枚がツモ可能になる", () => {
  const wall = Wall.create(createSeededRandom(1), false);
  expect(wall.live).toHaveLength(122);
  expect(wall.rinshan).toHaveLength(4);
  expect(wall.doraIndicators).toHaveLength(5);
  expect(wall.uraIndicators).toHaveLength(5);
  expect(Wall.remaining(wall)).toBe(122);
});

test("洗牌しても牌の内訳は136枚の牌セットと一致する", () => {
  const wall = Wall.create(createSeededRandom(3), true);
  const all = [...wall.live, ...wall.rinshan, ...wall.doraIndicators, ...wall.uraIndicators];
  expect(Tile.sort(all)).toStrictEqual(Tile.sort(Tile.fullSet(true)));
});

test("赤ドラありの牌山には赤5が各色1枚ずつ含まれ、なしなら含まれない", () => {
  const withAka = Wall.create(createSeededRandom(5), true);
  const withoutAka = Wall.create(createSeededRandom(5), false);
  const reds = (wall: Wall) =>
    [...wall.live, ...wall.rinshan, ...wall.doraIndicators, ...wall.uraIndicators].filter((tile) => Tile.isRed(tile));
  expect(Tile.sort(reds(withAka))).toStrictEqual(["0m", "0p", "0s"]);
  expect(reds(withoutAka)).toHaveLength(0);
});

test("配牌後は各家13枚になり、残り山は70枚になる", () => {
  const { wall, hands } = Wall.deal(Wall.create(createSeededRandom(9), true), 0);
  expect(hands.map((hand) => hand.length)).toStrictEqual([13, 13, 13, 13]);
  expect(Wall.remaining(wall)).toBe(70);
});

test("配牌は親から順に配られる", () => {
  const ordered = Tile.fullSet(false);
  const wall = Wall.fromTiles(ordered)!;
  const { hands } = Wall.deal(wall, 2);
  expect(hands[2]).toStrictEqual(Tile.sort(ordered.slice(0, 13)));
  expect(hands[3]).toStrictEqual(Tile.sort(ordered.slice(13, 26)));
  expect(hands[0]).toStrictEqual(Tile.sort(ordered.slice(26, 39)));
  expect(hands[1]).toStrictEqual(Tile.sort(ordered.slice(39, 52)));
});

test("ツモは山の先頭から順に1枚ずつ取り、残り枚数が減る", () => {
  const wall = Wall.fromTiles(Tile.fullSet(false))!;
  const first = Wall.draw(wall)!;
  const second = Wall.draw(first.wall)!;
  expect(first.tile).toBe("1m");
  expect(second.tile).toBe("1m");
  expect(Wall.remaining(second.wall)).toBe(120);
});

test("ドラ表示牌は最初1枚めくられ、カンごとに1枚ずつ増えて最大5枚になる", () => {
  const wall = Wall.create(createSeededRandom(11), true);
  expect(Wall.doraIndicators(wall)).toHaveLength(1);
  const revealed = [1, 2, 3, 4, 5, 6].reduce((current) => Wall.revealDora(current), wall);
  expect(Wall.doraIndicators(revealed)).toHaveLength(5);
  expect(Wall.uraDoraIndicators(revealed)).toHaveLength(5);
});

test("嶺上牌をツモると王牌から1枚取り、ツモ可能枚数も1枚減る", () => {
  const wall = Wall.create(createSeededRandom(13), true);
  const result = Wall.drawRinshan(wall)!;
  expect(result.tile).toBe(wall.rinshan[0]);
  expect(Wall.remaining(result.wall)).toBe(121);
});
