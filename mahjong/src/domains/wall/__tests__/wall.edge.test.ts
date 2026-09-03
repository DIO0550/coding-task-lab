import { test, expect } from "vitest";

import { Tile } from "@/src/domains/tile";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { Wall } from "..";

test("136枚でない並びからは牌山を作れない", () => {
  expect(Wall.fromTiles(Tile.fullSet(false).slice(1))).toBeUndefined();
});

test("山が尽きたらツモできない", () => {
  const wall = Wall.create(createSeededRandom(2), false);
  const exhausted = { ...wall, drawn: wall.live.length };
  expect(Wall.remaining(exhausted)).toBe(0);
  expect(Wall.draw(exhausted)).toBeUndefined();
});

test("嶺上牌は4枚までしかツモれない", () => {
  const wall = Wall.create(createSeededRandom(2), false);
  const used = { ...wall, rinshanDrawn: 4 };
  expect(Wall.canKan(used)).toBe(false);
  expect(Wall.drawRinshan(used)).toBeUndefined();
});

test("ツモ可能な牌が残っていなければカンできない", () => {
  const wall = Wall.create(createSeededRandom(2), false);
  expect(Wall.canKan({ ...wall, drawn: wall.live.length })).toBe(false);
});
