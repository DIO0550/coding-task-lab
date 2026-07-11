import { test, expect } from "vitest";

import { Wall } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import { Random } from "../../../libs/random/index.ts";

test("ツモは山の先頭から順に取られ残り枚数が減る", () => {
  const { wall } = Wall.build(Random.seeded(1), false);
  const expected = wall.drawPile[0];

  const drawn = Wall.drawTile(wall);

  expect(drawn).not.toBeNull();
  expect(drawn?.tile).toEqual(expected);
  expect(Wall.remaining(drawn!.wall)).toBe(69);
});

test("山が尽きたらツモはできない", () => {
  const built = Wall.build(Random.seeded(2), false);
  const empty = { ...built.wall, drawPile: [] as const };

  expect(Wall.drawTile(empty)).toBeNull();
  expect(Wall.remaining(empty)).toBe(0);
});

test("嶺上ツモで新ドラ表示牌が1枚追加され残り山が1減る", () => {
  const { wall } = Wall.build(Random.seeded(3), false);

  const drawn = Wall.drawRinshan(wall);

  expect(drawn).not.toBeNull();
  expect(drawn?.tile).toEqual(wall.deadWall[0]);
  expect(drawn?.wall.doraIndicators).toHaveLength(2);
  expect(drawn?.wall.doraIndicators[1]).toEqual(wall.deadWall[5]);
  expect(Wall.remaining(drawn!.wall)).toBe(69);
  expect(drawn?.wall.rinshanDrawn).toBe(1);
});

test("嶺上ツモは4回までで5回目はできない", () => {
  const { wall } = Wall.build(Random.seeded(4), false);

  const afterFourKans = [0, 1, 2, 3].reduce(
    (current) => Wall.drawRinshan(current)!.wall,
    wall,
  );

  expect(afterFourKans.rinshanDrawn).toBe(4);
  expect(afterFourKans.doraIndicators).toHaveLength(5);
  expect(Wall.remaining(afterFourKans)).toBe(66);
  expect(Wall.drawRinshan(afterFourKans)).toBeNull();
});

test("表ドラは表示牌の次の牌になる", () => {
  const built = Wall.build(Random.seeded(5), false);
  const indicator = built.wall.doraIndicators[0];

  const doras = Wall.doraTiles(built.wall);

  expect(doras).toHaveLength(1);
  expect(doras[0]).toEqual(Tile.doraFromIndicator(indicator));
});

test("裏ドラは公開済み表示牌の枚数だけ使われる", () => {
  const { wall } = Wall.build(Random.seeded(6), false);
  const afterKan = Wall.drawRinshan(wall)!.wall;

  const ura = Wall.uraDoraTiles(afterKan, afterKan.doraIndicators.length);

  expect(ura).toHaveLength(2);
  expect(ura[0]).toEqual(Tile.doraFromIndicator(afterKan.deadWall[9]));
  expect(ura[1]).toEqual(Tile.doraFromIndicator(afterKan.deadWall[10]));
});
