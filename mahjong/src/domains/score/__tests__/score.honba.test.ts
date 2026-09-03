import { test, expect } from "vitest";

import { Score } from "..";

test("ロンの本場は1本につき300点が放銃者の支払いに加算される", () => {
  expect(Score.calculate({ han: 3, fu: 30, isDealer: true, winType: "ron", honba: 2, kyotaku: 0 })).toStrictEqual({
    total: 6400,
    payments: [{ from: "discarder", amount: 6400 }],
  });
});

test("ツモの本場は1本につき各家100点ずつ加算される", () => {
  expect(Score.calculate({ han: 3, fu: 30, isDealer: false, winType: "tsumo", honba: 2, kyotaku: 0 })).toStrictEqual({
    total: 4600,
    payments: [
      { from: "dealer", amount: 2200 },
      { from: "non_dealer", amount: 1200 },
      { from: "non_dealer", amount: 1200 },
    ],
  });
});

test("供託リーチ棒は1本1000点として和了者が受け取り、内訳に kyotaku として含まれる", () => {
  expect(Score.calculate({ han: 1, fu: 30, isDealer: false, winType: "ron", honba: 0, kyotaku: 2 })).toStrictEqual({
    total: 3000,
    payments: [
      { from: "discarder", amount: 1000 },
      { from: "kyotaku", amount: 2000 },
    ],
  });
});

test("本場と供託は同時に計上され、合計は内訳の総和と一致する", () => {
  const result = Score.calculate({ han: 5, fu: 30, isDealer: false, winType: "tsumo", honba: 1, kyotaku: 1 });
  expect(result.payments).toStrictEqual([
    { from: "dealer", amount: 4100 },
    { from: "non_dealer", amount: 2100 },
    { from: "non_dealer", amount: 2100 },
    { from: "kyotaku", amount: 1000 },
  ]);
  expect(result.total).toBe(9300);
});

test("供託が0本なら内訳に kyotaku は含まれない", () => {
  expect(Score.calculate({ han: 1, fu: 30, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).payments).toHaveLength(1);
});
