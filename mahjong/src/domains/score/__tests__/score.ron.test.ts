import { test, expect } from "vitest";

import { Score } from "../index.ts";

test("子の1翻30符ロンは1000点になる", () => {
  const result = Score.calculate({
    han: 1,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result).toStrictEqual({
    total: 1000,
    payments: [{ from: "discarder", amount: 1000 }],
    level: "normal",
  });
});

test("子の3翻30符ロンは3900点になる", () => {
  const result = Score.calculate({
    han: 3,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.total).toBe(3900);
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 3900 }]);
  expect(result.level).toBe("normal");
});

test("子の4翻30符ロンは7700点になる(切り上げ満貫は適用しない)", () => {
  const result = Score.calculate({
    han: 4,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.total).toBe(7700);
  expect(result.level).toBe("normal");
});

test("子の3翻60符ロンも7700点になる(4翻30符と基本点が同じ)", () => {
  const result = Score.calculate({
    han: 3,
    fu: 60,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.total).toBe(7700);
  expect(result.level).toBe("normal");
});

test("親の2翻40符ロンは3900点になる", () => {
  const result = Score.calculate({
    han: 2,
    fu: 40,
    isDealer: true,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.total).toBe(3900);
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 3900 }]);
  expect(result.level).toBe("normal");
});
