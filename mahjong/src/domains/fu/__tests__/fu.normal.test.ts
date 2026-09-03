import { test, expect } from "vitest";

import { ankan, chi, fuOf, kan, pon } from "./setup";

test("平和ツモは20符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s", winType: "tsumo", hasPinfu: true }),
  ).toBe(20);
});

test("平和ロンは30符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s", winType: "ron", hasPinfu: true }),
  ).toBe(30);
});

test("七対子は25符固定になる", () => {
  expect(
    fuOf({ hand: ["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "pei", "pei", "chun", "chun"], winTile: "chun", winType: "tsumo" }),
  ).toBe(25);
});

test("国士無双は30符として扱う", () => {
  expect(
    fuOf({ hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"], winTile: "1m" }),
  ).toBe(30);
});

test("副露した平和形(符なし)のロンは30符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "2s", "3s", "4s", "9p", "9p"], melds: [chi("6s", "7s", "8s")], winTile: "4s", winType: "ron" }),
  ).toBe(30);
});

test("副露した平和形のツモは22符を切り上げて30符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "2s", "3s", "4s", "9p", "9p"], melds: [chi("6s", "7s", "8s")], winTile: "4s", winType: "tsumo" }),
  ).toBe(30);
});

test("門前ロンは10符加算され、嵌張待ちの2符と合わせて40符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "3s", winType: "ron" }),
  ).toBe(40);
});

test("辺張待ちは2符加算される", () => {
  expect(
    fuOf({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "3m", winType: "ron" }),
  ).toBe(40);
});

test("単騎待ちは2符加算される", () => {
  expect(
    fuOf({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "9p", winType: "ron" }),
  ).toBe(40);
});

test("門前ツモの2符と中張牌の暗刻4符で26符となり30符に切り上がる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "9p", "9p"], winTile: "4m", winType: "tsumo" }),
  ).toBe(30);
});

test("么九牌の暗刻は8符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "1s", "1s", "1s", "9p", "9p"], winTile: "4m", winType: "ron" }),
  ).toBe(40);
});

test("中張牌の明刻は2符、么九牌の明刻は4符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "6s", "7s", "8s", "9p", "9p"], melds: [pon("5p"), pon("1s")], winTile: "9p", winType: "ron" }),
  ).toBe(30);
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "6s", "7s", "8s", "9p", "9p"], melds: [pon("1p"), pon("1s")], winTile: "9p", winType: "ron" }),
  ).toBe(30);
});

test("么九牌の暗槓は32符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [ankan("1s")], winTile: "4m", winType: "ron" }),
  ).toBe(70);
});

test("中張牌の暗槓は16符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [ankan("5s")], winTile: "4m", winType: "ron" }),
  ).toBe(50);
});

test("么九牌の明槓は16符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [kan("1s")], winTile: "4m", winType: "ron" }),
  ).toBe(40);
});

test("中張牌の明槓は8符になる(20 + 明槓8 + 么九明刻4 + 単騎2 = 34 → 40)", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "9p", "9p"], melds: [kan("5s"), pon("haku")], winTile: "9p", winType: "ron" }),
  ).toBe(40);
});

test("役牌の雀頭は2符加算される", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "1s", "1s", "1s", "haku", "haku"], winTile: "5p", winType: "ron" }),
  ).toBe(50);
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "1s", "1s", "1s", "9p", "9p"], winTile: "5p", winType: "ron" }),
  ).toBe(40);
});

test("自風かつ場風の雀頭は4符、片方だけなら2符加算される", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "1s", "1s", "1s", "ton", "ton"] as const;
  expect(fuOf({ hand, winTile: "4m", winType: "ron", seatWind: "ton", roundWind: "ton" })).toBe(50);
  expect(fuOf({ hand, winTile: "4m", winType: "ron", seatWind: "ton", roundWind: "nan" })).toBe(40);
});

test("双碰待ちでロンした刻子は明刻として数え、ツモなら暗刻として数える", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "9p", "9p"] as const;
  expect(fuOf({ hand, winTile: "5s", winType: "ron" })).toBe(40);
  expect(fuOf({ hand, winTile: "5s", winType: "tsumo" })).toBe(30);
});
