import { test, expect } from "vitest";

import { createSeededRandom } from "..";

test("同じシードからは同じ乱数列が得られる", () => {
  const a = createSeededRandom(42);
  const b = createSeededRandom(42);
  expect([a(), a(), a()]).toStrictEqual([b(), b(), b()]);
});

test("異なるシードからは異なる乱数列が得られる", () => {
  const a = createSeededRandom(1);
  const b = createSeededRandom(2);
  expect([a(), a(), a()]).not.toStrictEqual([b(), b(), b()]);
});

test("乱数は 0 以上 1 未満の範囲に収まる", () => {
  const random = createSeededRandom(7);
  const values = Array.from({ length: 1000 }, () => random());
  expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
});
