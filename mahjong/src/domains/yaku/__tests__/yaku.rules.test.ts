import { test, expect } from "vitest";

import { chi, detectYaku, pon } from "./setup";

test("喰いタンなしでは副露した断么九は役にならない", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "5s", "5s", "5s", "8p", "8p"], melds: [chi("6s", "7s", "8s")], winTile: "8p", rules: { kuitan: false } }),
  ).toStrictEqual([]);
});

test("喰いタンなしでも門前の断么九は成立する", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"], winTile: "8p", rules: { kuitan: false } }),
  ).toStrictEqual([{ name: "tanyao", han: 1 }]);
});

test("後付けなしでは副露した手の役牌シャンポン和了(役牌側)は役なしになる", () => {
  expect(
    detectYaku({ hand: ["4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], melds: [chi("2m", "3m", "4m")], winTile: "haku", rules: { atozuke: false } }),
  ).toStrictEqual([]);
});

test("後付けありなら役牌シャンポン和了(役牌側)も役牌として成立する", () => {
  expect(
    detectYaku({ hand: ["4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], melds: [chi("2m", "3m", "4m")], winTile: "haku", rules: { atozuke: true } }),
  ).toStrictEqual([{ name: "haku", han: 1 }]);
});

test("後付けなしでも役牌の刻子が和了前から完成していれば成立する", () => {
  expect(
    detectYaku({ hand: ["4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], melds: [chi("2m", "3m", "4m")], winTile: "9p", rules: { atozuke: false } }),
  ).toStrictEqual([{ name: "haku", han: 1 }]);
});

test("後付けなしでも和了牌に依存しない別の役があれば成立する", () => {
  expect(
    detectYaku({ hand: ["4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], melds: [pon("chun")], winTile: "haku", rules: { atozuke: false } }),
  ).toStrictEqual([
    { name: "haku", han: 1 },
    { name: "chun", han: 1 },
  ]);
});

test("後付けなしでも門前の手は制限を受けない", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], winTile: "haku", rules: { atozuke: false } }),
  ).toStrictEqual([{ name: "haku", han: 1 }]);
});
