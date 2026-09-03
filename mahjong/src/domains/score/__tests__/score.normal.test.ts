import { test, expect } from "vitest";

import { Score } from "..";

test.each([
  [1, 1000],
  [2, 2000],
  [3, 3900],
  [4, 7700],
])("子のロン30符%i翻は%i点", (han, total) => {
  expect(Score.calculate({ han, fu: 30, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 })).toStrictEqual({
    total,
    payments: [{ from: "discarder", amount: total }],
  });
});

test.each([
  [1, 1500],
  [2, 2900],
  [3, 5800],
  [4, 11600],
])("親のロン30符%i翻は%i点", (han, total) => {
  expect(Score.calculate({ han, fu: 30, isDealer: true, winType: "ron", honba: 0, kyotaku: 0 })).toStrictEqual({
    total,
    payments: [{ from: "discarder", amount: total }],
  });
});

test.each([
  [1, 500, 300],
  [2, 1000, 500],
  [3, 2000, 1000],
  [4, 3900, 2000],
])("子のツモ30符%i翻は親%i点・子%i点の支払い", (han, fromDealer, fromOther) => {
  expect(Score.calculate({ han, fu: 30, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 })).toStrictEqual({
    total: fromDealer + fromOther * 2,
    payments: [
      { from: "dealer", amount: fromDealer },
      { from: "non_dealer", amount: fromOther },
      { from: "non_dealer", amount: fromOther },
    ],
  });
});

test.each([
  [1, 500],
  [2, 1000],
  [3, 2000],
  [4, 3900],
])("親のツモ30符%i翻は子全員%i点ずつの支払い", (han, each) => {
  expect(Score.calculate({ han, fu: 30, isDealer: true, winType: "tsumo", honba: 0, kyotaku: 0 })).toStrictEqual({
    total: each * 3,
    payments: [
      { from: "non_dealer", amount: each },
      { from: "non_dealer", amount: each },
      { from: "non_dealer", amount: each },
    ],
  });
});

test.each([
  [1, 1300],
  [2, 2600],
  [3, 5200],
])("子のロン40符%i翻は%i点", (han, total) => {
  expect(Score.calculate({ han, fu: 40, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(total);
});

test("平和ツモ(20符)2翻は子なら親700・子400、親なら子全員700", () => {
  expect(Score.calculate({ han: 2, fu: 20, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 }).payments).toStrictEqual([
    { from: "dealer", amount: 700 },
    { from: "non_dealer", amount: 400 },
    { from: "non_dealer", amount: 400 },
  ]);
  expect(Score.calculate({ han: 2, fu: 20, isDealer: true, winType: "tsumo", honba: 0, kyotaku: 0 }).total).toBe(2100);
});

test("七対子(25符)2翻ロンは子1600点・親2400点", () => {
  expect(Score.calculate({ han: 2, fu: 25, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(1600);
  expect(Score.calculate({ han: 2, fu: 25, isDealer: true, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(2400);
});

test("七対子(25符)3翻ツモは子なら親1600・子800", () => {
  expect(Score.calculate({ han: 3, fu: 25, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 }).payments).toStrictEqual([
    { from: "dealer", amount: 1600 },
    { from: "non_dealer", amount: 800 },
    { from: "non_dealer", amount: 800 },
  ]);
});

test("60符3翻ロンは切り上げ満貫にならず7700点になる", () => {
  expect(Score.calculate({ han: 3, fu: 60, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(7700);
});

test("30符4翻ロンは切り上げ満貫にならず7700点になる", () => {
  expect(Score.calculate({ han: 4, fu: 30, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(7700);
});

test("40符4翻・70符3翻は基本点が2000点に達するので満貫になる", () => {
  expect(Score.calculate({ han: 4, fu: 40, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(8000);
  expect(Score.calculate({ han: 3, fu: 70, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(8000);
});
