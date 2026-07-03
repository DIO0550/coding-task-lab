import { test, expect } from "vitest";

import { Score } from "../index.ts";

const childRon = (han: number, fu: number) =>
  Score.calculate({ han, fu, isDealer: false, winType: "ron", honba: 0, kyotaku: 0 });

const dealerRon = (han: number, fu: number) =>
  Score.calculate({ han, fu, isDealer: true, winType: "ron", honba: 0, kyotaku: 0 });

test("5翻は満貫として子8000点・親12000点", () => {
  expect(childRon(5, 30).total).toBe(8000);
  expect(dealerRon(5, 30).total).toBe(12000);
});

test("基本点が2000点を超える3〜4翻は満貫に切り上げる", () => {
  expect(childRon(4, 40).total).toBe(8000);
  expect(childRon(3, 70).total).toBe(8000);
});

test("6〜7翻は跳満として子12000点・親18000点", () => {
  expect(childRon(6, 30).total).toBe(12000);
  expect(childRon(7, 30).total).toBe(12000);
  expect(dealerRon(6, 30).total).toBe(18000);
});

test("8〜10翻は倍満として子16000点・親24000点", () => {
  expect(childRon(8, 30).total).toBe(16000);
  expect(childRon(10, 30).total).toBe(16000);
  expect(dealerRon(8, 30).total).toBe(24000);
});

test("11〜12翻は三倍満として子24000点・親36000点", () => {
  expect(childRon(11, 30).total).toBe(24000);
  expect(childRon(12, 30).total).toBe(24000);
  expect(dealerRon(11, 30).total).toBe(36000);
});

test("13翻以上は数え役満として子32000点・親48000点", () => {
  expect(childRon(13, 30).total).toBe(32000);
  expect(childRon(20, 30).total).toBe(32000);
  expect(dealerRon(13, 30).total).toBe(48000);
});

test("役満は子32000点・親48000点", () => {
  const child = Score.calculateYakuman({
    multiplier: 1,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  const dealer = Score.calculateYakuman({
    multiplier: 1,
    isDealer: true,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  expect(child.total).toBe(32000);
  expect(dealer.total).toBe(48000);
});

test("ダブル役満は子64000点・親96000点", () => {
  const child = Score.calculateYakuman({
    multiplier: 2,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  const dealer = Score.calculateYakuman({
    multiplier: 2,
    isDealer: true,
    winType: "tsumo",
    honba: 0,
    kyotaku: 0,
  });
  expect(child.total).toBe(64000);
  expect(dealer.total).toBe(96000);
  expect(dealer.payments).toStrictEqual([
    { from: "non_dealer", amount: 32000 },
    { from: "non_dealer", amount: 32000 },
    { from: "non_dealer", amount: 32000 },
  ]);
});

test("役満の複合はダブル役満を上限とする", () => {
  const result = Score.calculateYakuman({
    multiplier: 3,
    isDealer: false,
    winType: "ron",
    honba: 0,
    kyotaku: 0,
  });
  expect(result.total).toBe(64000);
});

test("子の役満ツモは親16000・子8000ずつの支払いになる", () => {
  const result = Score.calculateYakuman({
    multiplier: 1,
    isDealer: false,
    winType: "tsumo",
    honba: 0,
    kyotaku: 0,
  });
  expect(result.payments).toStrictEqual([
    { from: "dealer", amount: 16000 },
    { from: "non_dealer", amount: 8000 },
    { from: "non_dealer", amount: 8000 },
  ]);
});
