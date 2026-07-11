import { test, expect } from "vitest";

import { Random } from "../index.ts";

test("同じ seed の生成器は同じ乱数列を返す", () => {
  const a = Random.seeded(42);
  const b = Random.seeded(42);

  const seqA = [a(), a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b(), b()];

  expect(seqA).toEqual(seqB);
});

test("異なる seed の生成器は異なる乱数列を返す", () => {
  const a = Random.seeded(1);
  const b = Random.seeded(2);

  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];

  expect(seqA).not.toEqual(seqB);
});

test("生成される乱数は [0,1) の範囲に収まる", () => {
  const rng = Random.seeded(7);

  for (let i = 0; i < 1000; i += 1) {
    const value = rng();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

test("シャッフルは元の配列を変更せず同じ要素の並べ替えを返す", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const frozen = [...original];

  const shuffled = Random.shuffle(original, Random.seeded(3));

  expect(original).toEqual(frozen);
  expect([...shuffled].sort((a, b) => a - b)).toEqual(frozen);
});

test("同じ seed でのシャッフル結果は再現できる", () => {
  const items = ["a", "b", "c", "d", "e", "f"];

  const first = Random.shuffle(items, Random.seeded(99));
  const second = Random.shuffle(items, Random.seeded(99));

  expect(first).toEqual(second);
});

test("nextSeed は 32bit 非負整数を返し同じ生成器からは再現できる", () => {
  const seedA = Random.nextSeed(Random.seeded(5));
  const seedB = Random.nextSeed(Random.seeded(5));

  expect(seedA).toBe(seedB);
  expect(Number.isInteger(seedA)).toBe(true);
  expect(seedA).toBeGreaterThanOrEqual(0);
  expect(seedA).toBeLessThan(4294967296);
});
