import { test, expect } from "vitest";

import { Score } from "../index.ts";

test("子の3翻30符ツモは親2000・子1000ずつの合計4000点になる", () => {
  const result = Score.calculate({
    han: 3,
    fu: 30,
    isDealer: false,
    winType: "tsumo",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.payments).toStrictEqual([
    { from: "dealer", amount: 2000 },
    { from: "non_dealer", amount: 1000 },
    { from: "non_dealer", amount: 1000 },
  ]);
  expect(result.total).toBe(4000);
  expect(result.level).toBe("normal");
});

test("親の4翻30符ツモは3900オールの合計11700点になる", () => {
  const result = Score.calculate({
    han: 4,
    fu: 30,
    isDealer: true,
    winType: "tsumo",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.payments).toStrictEqual([
    { from: "non_dealer", amount: 3900 },
    { from: "non_dealer", amount: 3900 },
    { from: "non_dealer", amount: 3900 },
  ]);
  expect(result.total).toBe(11700);
  expect(result.level).toBe("normal");
});
