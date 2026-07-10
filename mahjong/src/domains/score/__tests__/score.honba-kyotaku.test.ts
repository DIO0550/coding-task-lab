import { test, expect } from "vitest";

import { Score } from "../index.ts";

test("1本場の子1翻30符ロンは+300点されて1300点になる", () => {
  const result = Score.calculate({
    han: 1,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 1,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.total).toBe(1300);
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 1300 }]);
});

test("本場はツモの各支払いにも+100点される", () => {
  const result = Score.calculate({
    han: 3,
    fu: 30,
    isDealer: false,
    winType: "tsumo",
    honba: 1,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.payments).toStrictEqual([
    { from: "dealer", amount: 2100 },
    { from: "non_dealer", amount: 1100 },
    { from: "non_dealer", amount: 1100 },
  ]);
  expect(result.total).toBe(4300);
});

test("供託2本は支払いには影響せず合計にのみ+2000される", () => {
  const result = Score.calculate({
    han: 1,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 2,
    yakumanMultiplier: 0,
  });
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 1000 }]);
  expect(result.total).toBe(3000);
});

test("本場と供託は両方とも合計に反映される", () => {
  const result = Score.calculate({
    han: 1,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 1,
    kyotaku: 2,
    yakumanMultiplier: 0,
  });
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 1300 }]);
  expect(result.total).toBe(3300);
});
