import { test, expect } from "vitest";

import { Score } from "..";

test.each([
  [5, 8000, 12000],
  [6, 12000, 18000],
  [7, 12000, 18000],
  [8, 16000, 24000],
  [9, 16000, 24000],
  [10, 16000, 24000],
  [11, 24000, 36000],
  [12, 24000, 36000],
  [13, 32000, 48000],
  [14, 32000, 48000],
  [20, 32000, 48000],
  [26, 64000, 96000],
])("%i翻のロンは子%i点・親%i点", (han, child, dealer) => {
  expect(Score.calculate({ han, fu: 30, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(child);
  expect(Score.calculate({ han, fu: 30, isDealer: true, winType: "ron", honba: 0, kyotaku: 0 }).total).toBe(dealer);
});

test("満貫の子ツモは親4000・子2000、親ツモは子全員4000", () => {
  expect(Score.calculate({ han: 5, fu: 30, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 }).payments).toStrictEqual([
    { from: "dealer", amount: 4000 },
    { from: "non_dealer", amount: 2000 },
    { from: "non_dealer", amount: 2000 },
  ]);
  expect(Score.calculate({ han: 5, fu: 30, isDealer: true, winType: "tsumo", honba: 0, kyotaku: 0 }).payments).toStrictEqual([
    { from: "non_dealer", amount: 4000 },
    { from: "non_dealer", amount: 4000 },
    { from: "non_dealer", amount: 4000 },
  ]);
});

test("役満の子ツモは親16000・子8000、親ツモは子全員16000", () => {
  expect(Score.calculate({ han: 13, fu: 30, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 }).total).toBe(32000);
  expect(Score.calculate({ han: 13, fu: 30, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 }).payments[0]).toStrictEqual({
    from: "dealer",
    amount: 16000,
  });
  expect(Score.calculate({ han: 13, fu: 30, isDealer: true, winType: "tsumo", honba: 0, kyotaku: 0 }).total).toBe(48000);
});

test("ダブル役満(26翻)のツモは子なら親32000・子16000", () => {
  expect(Score.calculate({ han: 26, fu: 30, isDealer: false, winType: "tsumo", honba: 0, kyotaku: 0 }).payments).toStrictEqual([
    { from: "dealer", amount: 32000 },
    { from: "non_dealer", amount: 16000 },
    { from: "non_dealer", amount: 16000 },
  ]);
});

test.each([
  [4, 30, "none"],
  [3, 60, "none"],
  [4, 40, "mangan"],
  [3, 70, "mangan"],
  [5, 20, "mangan"],
  [6, 30, "haneman"],
  [8, 30, "baiman"],
  [11, 30, "sanbaiman"],
  [13, 30, "yakuman"],
  [25, 30, "yakuman"],
  [26, 30, "double_yakuman"],
] as const)("%i翻%i符の区分は %s", (han, fu, limit) => {
  expect(Score.limit(han, fu)).toBe(limit);
});

test("基本点は符×2^(翻+2)で、満貫以上は区分ごとの固定値になる", () => {
  expect(Score.basePoints(1, 30)).toBe(240);
  expect(Score.basePoints(3, 40)).toBe(1280);
  expect(Score.basePoints(5, 30)).toBe(2000);
  expect(Score.basePoints(13, 30)).toBe(8000);
  expect(Score.basePoints(26, 30)).toBe(16000);
});
