import { test, expect } from "vitest";

import { Score } from "../index.ts";

test("5翻は基本点2000の満貫になり子ロンは8000点になる", () => {
  const result = Score.calculate({
    han: 5,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("mangan");
  expect(result.total).toBe(8000);
});

test("満貫の親ロンは12000点になる", () => {
  const result = Score.calculate({
    han: 5,
    fu: 30,
    isDealer: true,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("mangan");
  expect(result.total).toBe(12000);
});

test("6翻は跳満(基本点3000)になり子ロンは12000点になる", () => {
  const result = Score.calculate({
    han: 6,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("haneman");
  expect(result.total).toBe(12000);
});

test("7翻も跳満のままになる(6-7翻の上限境界)", () => {
  const result = Score.calculate({
    han: 7,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("haneman");
  expect(result.total).toBe(12000);
});

test("8翻は倍満(基本点4000)になり子ロンは16000点になる", () => {
  const result = Score.calculate({
    han: 8,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("baiman");
  expect(result.total).toBe(16000);
});

test("10翻も倍満のままになる(8-10翻の上限境界)", () => {
  const result = Score.calculate({
    han: 10,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("baiman");
  expect(result.total).toBe(16000);
});

test("11翻は三倍満(基本点6000)になり子ロンは24000点になる", () => {
  const result = Score.calculate({
    han: 11,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("sanbaiman");
  expect(result.total).toBe(24000);
});

test("12翻も三倍満のままになる(11-12翻の上限境界)", () => {
  const result = Score.calculate({
    han: 12,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("sanbaiman");
  expect(result.total).toBe(24000);
});

test("13翻は数え役満(基本点8000)になり子ロンは32000点になる", () => {
  const result = Score.calculate({
    han: 13,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("kazoe_yakuman");
  expect(result.total).toBe(32000);
});

test("4翻以下でも基本点が2000を超える場合(4翻40符)は満貫になる", () => {
  const result = Score.calculate({
    han: 4,
    fu: 40,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("mangan");
  expect(result.total).toBe(8000);
});

test("4翻30符は基本点が2000を超えないため満貫にならない", () => {
  const result = Score.calculate({
    han: 4,
    fu: 30,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
    yakumanMultiplier: 0,
  });
  expect(result.level).toBe("normal");
  expect(result.total).toBe(7700);
});
