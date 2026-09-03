import { test, expect } from "vitest";

import { Wind } from "..";

test("風は東・南・西・北の順に並ぶ", () => {
  expect(Wind.all()).toStrictEqual(["ton", "nan", "sha", "pei"]);
});

test.each([
  ["ton", "nan"],
  ["nan", "sha"],
  ["sha", "pei"],
  ["pei", "ton"],
] as const)("%s の次の風は %s である", (wind, expected) => {
  expect(Wind.next(wind)).toBe(expected);
});

test("風の文字列表記は東南西北のみ解釈される", () => {
  expect(Wind.parse("sha")).toBe("sha");
  expect(Wind.parse("haku")).toBeUndefined();
  expect(Wind.parse(1)).toBeUndefined();
});

test("負の添字も4周期で風に変換される", () => {
  expect(Wind.fromIndex(-1)).toBe("pei");
  expect(Wind.fromIndex(5)).toBe("nan");
});
