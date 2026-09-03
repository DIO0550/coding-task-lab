import { test, expect } from "vitest";

import { Seat } from "..";

test("席は0から3まで時計回りに進み、3の下家は0に戻る", () => {
  expect(Seat.next(0)).toBe(1);
  expect(Seat.next(3)).toBe(0);
  expect(Seat.previous(0)).toBe(3);
});

test("親が席1のとき席1が東家、席2が南家、席0が北家になる", () => {
  expect(Seat.windOf(1, 1)).toBe("ton");
  expect(Seat.windOf(2, 1)).toBe("nan");
  expect(Seat.windOf(3, 1)).toBe("sha");
  expect(Seat.windOf(0, 1)).toBe("pei");
});

test("席2の下家は席3であり、席1は席2の下家ではない", () => {
  expect(Seat.isNextOf(3, 2)).toBe(true);
  expect(Seat.isNextOf(1, 2)).toBe(false);
});

test("打牌者からの距離は下家=1・対面=2・上家=3になる", () => {
  expect(Seat.distanceFrom(3, 0)).toBe(1);
  expect(Seat.distanceFrom(3, 1)).toBe(2);
  expect(Seat.distanceFrom(3, 2)).toBe(3);
});
