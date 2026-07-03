import { test, expect } from "vitest";

import { Score } from "../index.ts";

test("子の30符2翻ロンは2000点", () => {
  const result = Score.calculate({
    han: 2,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  expect(result).toStrictEqual({
    total: 2000,
    payments: [{ from: "discarder", amount: 2000 }],
  });
});

test("親の30符2翻ロンは2900点", () => {
  const result = Score.calculate({
    han: 2,
    fu: 30,
    isDealer: true,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  expect(result.total).toBe(2900);
});

test("子の30符3翻ツモは親2000・子1000の計4000点", () => {
  const result = Score.calculate({
    han: 3,
    fu: 30,
    isDealer: false,
    winType: "tsumo",
    honba: 0,
    kyotaku: 0,
  });
  expect(result).toStrictEqual({
    total: 4000,
    payments: [
      { from: "dealer", amount: 2000 },
      { from: "non_dealer", amount: 1000 },
      { from: "non_dealer", amount: 1000 },
    ],
  });
});

test("親の30符1翻ツモは各500の計1500点", () => {
  const result = Score.calculate({
    han: 1,
    fu: 30,
    isDealer: true,
    winType: "tsumo",
    honba: 0,
    kyotaku: 0,
  });
  expect(result.total).toBe(1500);
  expect(result.payments).toStrictEqual([
    { from: "non_dealer", amount: 500 },
    { from: "non_dealer", amount: 500 },
    { from: "non_dealer", amount: 500 },
  ]);
});

test("切り上げ満貫は採用せず子の30符4翻ロンは7700点", () => {
  const result = Score.calculate({
    han: 4,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  expect(result.total).toBe(7700);
});

test("子の25符2翻ロンは1600点(七対子)", () => {
  const result = Score.calculate({
    han: 2,
    fu: 25,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  expect(result.total).toBe(1600);
});

test("本場はロンで1本につき300点加算される", () => {
  const result = Score.calculate({
    han: 2,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 2,
    kyotaku: 0,
  });
  expect(result.total).toBe(2600);
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 2600 }]);
});

test("本場はツモで1本につき各家100点加算される", () => {
  const result = Score.calculate({
    han: 3,
    fu: 30,
    isDealer: false,
    winType: "tsumo",
    honba: 1,
    kyotaku: 0,
  });
  expect(result.payments).toStrictEqual([
    { from: "dealer", amount: 2100 },
    { from: "non_dealer", amount: 1100 },
    { from: "non_dealer", amount: 1100 },
  ]);
  expect(result.total).toBe(4300);
});

test("供託は1本につき1000点が和了者に加算される", () => {
  const result = Score.calculate({
    han: 2,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 2,
  });
  expect(result.total).toBe(4000);
  expect(result.payments).toContainEqual({ from: "riichi_sticks", amount: 2000 });
});
