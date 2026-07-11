import { test, expect } from "vitest";

import { Wall } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import { Random } from "../../../libs/random/index.ts";

test("配牌後に各家13枚が配られ残り山は70枚になる", () => {
  const { wall, hands } = Wall.build(Random.seeded(1), false);

  expect(hands).toHaveLength(4);
  for (const hand of hands) {
    expect(hand).toHaveLength(13);
  }
  expect(Wall.remaining(wall)).toBe(70);
});

test("王牌は14枚確保され表ドラ表示牌が1枚公開される", () => {
  const { wall } = Wall.build(Random.seeded(2), false);

  expect(wall.deadWall).toHaveLength(14);
  expect(wall.doraIndicators).toHaveLength(1);
  expect(wall.uraDoraIndicators).toHaveLength(5);
});

test("赤ドラなしでは全136枚に赤5が含まれない", () => {
  const { wall, hands } = Wall.build(Random.seeded(3), false);

  const all = [...hands.flat(), ...wall.drawPile, ...wall.deadWall];
  expect(all).toHaveLength(136);
  expect(all.filter((tile) => tile.red)).toHaveLength(0);
});

test("赤ドラありでは5m/5p/5sが各1枚だけ赤5に置き換わる", () => {
  const { wall, hands } = Wall.build(Random.seeded(4), true);

  const all = [...hands.flat(), ...wall.drawPile, ...wall.deadWall];
  const reds = all.filter((tile) => tile.red);
  expect(reds).toHaveLength(3);
  expect(reds.map((tile) => Tile.toNotation(tile)).toSorted()).toEqual([
    "0m",
    "0p",
    "0s",
  ]);
  const fiveMan = all.filter(
    (tile) => tile.suit === "m" && tile.rank === 5,
  );
  expect(fiveMan).toHaveLength(4);
});

test("生成される牌は各牌種ちょうど4枚ずつの合計136枚になる", () => {
  const { wall, hands } = Wall.build(Random.seeded(5), true);

  const all = [...hands.flat(), ...wall.drawPile, ...wall.deadWall];
  const counts = new Map<string, number>();
  for (const tile of all) {
    const key = Tile.key(tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  expect(counts.size).toBe(34);
  for (const count of counts.values()) {
    expect(count).toBe(4);
  }
});

test("同じ乱数seedからは同じ配牌と牌山が再現される", () => {
  const first = Wall.build(Random.seeded(42), true);
  const second = Wall.build(Random.seeded(42), true);

  expect(first.hands).toEqual(second.hands);
  expect(first.wall).toEqual(second.wall);
});

test("固定の並びを注入すると席順どおりに配牌される", () => {
  const { hands } = Wall.build(Random.seeded(6), false);
  const flat = Wall.build(Random.seeded(6), false);
  const order = [
    ...flat.hands.flat(),
    ...flat.wall.drawPile,
    ...flat.wall.deadWall,
  ];

  const rebuilt = Wall.buildFromOrder(order);

  expect(rebuilt).not.toBeNull();
  expect(rebuilt?.hands).toEqual(hands);
});

test("136枚に満たない並びからは牌山を構築できない", () => {
  const { wall } = Wall.build(Random.seeded(7), false);

  expect(Wall.buildFromOrder(wall.drawPile)).toBeNull();
});
