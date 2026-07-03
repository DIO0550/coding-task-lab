import { test, expect } from "vitest";

import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import type { Rng } from "@/src/libs/random";

const seededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const allTiles = (wall: Wall): readonly Tile[] => [...wall.live, ...wall.dead];

test("牌山は全136枚で生成される", () => {
  const wall = Wall.create(seededRng(1), { akaDora: false });
  expect(allTiles(wall)).toHaveLength(136);
});

test("赤ドラありでは0m/0p/0sが各1枚含まれ、置き換えられた5は3枚になる", () => {
  const wall = Wall.create(seededRng(2), { akaDora: true });
  const tiles = allTiles(wall);
  expect(tiles.filter((tile) => tile === "0m")).toHaveLength(1);
  expect(tiles.filter((tile) => tile === "0p")).toHaveLength(1);
  expect(tiles.filter((tile) => tile === "0s")).toHaveLength(1);
  expect(tiles.filter((tile) => tile === "5m")).toHaveLength(3);
});

test("赤ドラなしでは赤5が含まれず5は各4枚になる", () => {
  const wall = Wall.create(seededRng(3), { akaDora: false });
  const tiles = allTiles(wall);
  expect(tiles.some(Tile.isRed)).toBe(false);
  expect(tiles.filter((tile) => tile === "5p")).toHaveLength(4);
});

test("生成直後のツモ可能枚数は王牌14枚を除いた122枚になる", () => {
  const wall = Wall.create(seededRng(4), { akaDora: false });
  expect(Wall.liveCount(wall)).toBe(122);
});

test("配牌すると4人へ13枚ずつ配られツモ可能枚数は70枚になる", () => {
  const dealt = Wall.deal(Wall.create(seededRng(5), { akaDora: false }));
  expect(dealt).not.toBeNull();
  expect(dealt?.hands).toHaveLength(4);
  for (const hand of dealt?.hands ?? []) {
    expect(hand).toHaveLength(13);
  }
  expect(dealt === null ? -1 : Wall.liveCount(dealt.wall)).toBe(70);
});

test("ツモると山の先頭の牌が得られ残りが1枚減る", () => {
  const wall = Wall.create(seededRng(6), { akaDora: false });
  const first = wall.live[0];
  const drawn = Wall.draw(wall);
  expect(drawn?.tile).toBe(first);
  expect(drawn === null ? -1 : Wall.liveCount(drawn.wall)).toBe(121);
});

test("ドラ表示牌は開局時に1枚めくられている", () => {
  const wall = Wall.create(seededRng(7), { akaDora: false });
  expect(Wall.doraIndicators(wall)).toHaveLength(1);
});

test("嶺上ツモで新ドラ表示牌がめくれ、ツモ可能枚数が1減る", () => {
  const wall = Wall.create(seededRng(8), { akaDora: false });
  const result = Wall.drawRinshan(wall);
  expect(result).not.toBeNull();
  expect(result === null ? [] : Wall.doraIndicators(result.wall)).toHaveLength(
    2,
  );
  expect(result === null ? -1 : Wall.liveCount(result.wall)).toBe(121);
});

test("嶺上牌は4枚までしかツモれない", () => {
  const start = Wall.create(seededRng(9), { akaDora: false });
  const afterFour = [1, 2, 3, 4].reduce(
    (wall) => Wall.drawRinshan(wall)?.wall ?? wall,
    start,
  );
  expect(Wall.canRinshan(afterFour)).toBe(false);
  expect(Wall.drawRinshan(afterFour)).toBeNull();
});

test("山が尽きているとツモれない", () => {
  const empty: Wall = {
    live: [],
    dead: Array.from({ length: 14 }, () => "1m" as const),
    rinshanDrawn: 0,
    doraCount: 1,
  };
  expect(Wall.draw(empty)).toBeNull();
  expect(Wall.canRinshan(empty)).toBe(false);
});
