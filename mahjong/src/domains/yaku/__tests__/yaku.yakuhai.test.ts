import { test, expect } from "vitest";

import { ankan, kan, pon, yakuNames } from "./setup";

test("白の刻子があれば役牌(白)が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], winTile: "9p" }),
  ).toStrictEqual(["haku"]);
});

test("發の刻子があれば役牌(發)が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "hatsu", "hatsu", "hatsu", "9p", "9p"], winTile: "9p" }),
  ).toStrictEqual(["hatsu"]);
});

test("中の刻子があれば役牌(中)が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "chun", "chun", "chun", "9p", "9p"], winTile: "9p" }),
  ).toStrictEqual(["chun"]);
});

test("自風の刻子があれば自風牌が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"], winTile: "9p", seatWind: "sha", roundWind: "ton" }),
  ).toStrictEqual(["seat_wind"]);
});

test("場風の刻子があれば場風牌が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "nan", "nan", "nan", "9p", "9p"], winTile: "9p", seatWind: "sha", roundWind: "nan" }),
  ).toStrictEqual(["round_wind"]);
});

test("自風かつ場風(ダブ東)の刻子は自風牌と場風牌の両方が1翻ずつ付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "ton", "ton", "ton", "9p", "9p"], winTile: "9p", seatWind: "ton", roundWind: "ton" }),
  ).toStrictEqual(["seat_wind", "round_wind"]);
});

test("自風でも場風でもない風牌の刻子には役が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "pei", "pei", "pei", "9p", "9p"], winTile: "9p", seatWind: "nan", roundWind: "ton" }),
  ).toStrictEqual([]);
});

test("役牌の槓子(明槓・暗槓)も役牌として数える", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [kan("haku")], winTile: "9p" }),
  ).toStrictEqual(["haku"]);
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [ankan("chun")], winTile: "9p" }),
  ).toStrictEqual(["chun"]);
});

test("ポンした役牌も役牌として数える", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [pon("hatsu")], winTile: "9p" }),
  ).toStrictEqual(["hatsu"]);
});

test("役牌の雀頭だけでは役にならない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9m", "9m", "9m", "haku", "haku"], winTile: "haku" }),
  ).toStrictEqual([]);
});

test("複数の役牌刻子はそれぞれ1翻ずつ付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "haku", "haku", "haku", "chun", "chun", "chun", "9p", "9p"], melds: [pon("nan")], winTile: "9p", seatWind: "nan" }),
  ).toStrictEqual(["haku", "chun", "seat_wind"]);
});
