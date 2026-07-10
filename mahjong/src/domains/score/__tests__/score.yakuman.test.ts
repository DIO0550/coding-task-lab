import { test, expect } from "vitest";

import { Score } from "../index.ts";

test("役満(yakumanMultiplier=1)の子ロンは32000点になる", () => {
  const result = Score.calculate({
    han: 13,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 1,
  });
  expect(result.level).toBe("yakuman");
  expect(result.total).toBe(32000);
  expect(result.payments).toStrictEqual([{ from: "discarder", amount: 32000 }]);
});

test("役満の親ロンは48000点になる", () => {
  const result = Score.calculate({
    han: 13,
    fu: 30,
    isDealer: true,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 1,
  });
  expect(result.level).toBe("yakuman");
  expect(result.total).toBe(48000);
});

test("ダブル役満(yakumanMultiplier=2)の子ロンは64000点になる", () => {
  const result = Score.calculate({
    han: 26,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 2,
  });
  expect(result.level).toBe("yakuman");
  expect(result.total).toBe(64000);
});

test("yakumanMultiplierが3でも2にクランプされ、ダブル役満と同額の64000点になる", () => {
  const result = Score.calculate({
    han: 26,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 3,
  });
  expect(result.level).toBe("yakuman");
  expect(result.total).toBe(64000);
});
