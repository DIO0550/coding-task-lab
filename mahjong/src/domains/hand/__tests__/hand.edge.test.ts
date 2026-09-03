import { test, expect } from "vitest";

import { Meld } from "@/src/domains/meld";

import { Hand } from "..";

test("純手牌が13枚しかない場合は手牌にならない", () => {
  expect(Hand.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"], [])).toBeUndefined();
});

test("副露を含めた合計が14枚相当でなければ手牌にならない", () => {
  const pon = Meld.create("pon", ["haku", "haku", "haku"])!;
  expect(Hand.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], [pon])).toBeUndefined();
});

test("同じ牌が5枚以上あれば手牌にならない", () => {
  expect(Hand.create(["1m", "1m", "1m", "1m", "0m", "5m", "5m", "5m", "5m", "7s", "8s", "9s", "ton", "ton"], [])).toBeUndefined();
});

test("副露を含めて同じ牌が5枚以上あれば手牌にならない", () => {
  const kan = Meld.create("kan", ["1m", "1m", "1m", "1m"])!;
  expect(Hand.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton"], [kan])).toBeUndefined();
});

test("同じ色の赤5が2枚あれば手牌にならない", () => {
  expect(Hand.create(["0m", "0m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "2p"], [])).toBeUndefined();
});
