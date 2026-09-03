import { test, expect } from "vitest";

import { Meld } from "@/src/domains/meld";

import { detectYaku, pon } from "./setup";

test("ドラは手牌に含まれる枚数分だけ翻として付く", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "3p", "3p", "3p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"], winTile: "8p", dora: ["3p"] }),
  ).toStrictEqual([
    { name: "tanyao", han: 1 },
    { name: "dora", han: 3 },
  ]);
});

test("副露した牌もドラとして数える", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"], melds: [pon("3p")], winTile: "8p", dora: ["3p"] }),
  ).toStrictEqual([
    { name: "tanyao", han: 1 },
    { name: "dora", han: 3 },
  ]);
});

test("同じドラが複数枚めくれていればその回数分だけ重ねて数える", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"], winTile: "8p", dora: ["3p", "3p"] }),
  ).toStrictEqual([
    { name: "tanyao", han: 1 },
    { name: "dora", han: 2 },
  ]);
});

test("裏ドラはリーチしている場合のみ付く", () => {
  const hand = ["2m", "3m", "4m", "3p", "4p", "5p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(detectYaku({ hand, winTile: "8p", riichi: "riichi", uraDora: ["8p"] })).toStrictEqual([
    { name: "riichi", han: 1 },
    { name: "tanyao", han: 1 },
    { name: "ura_dora", han: 2 },
  ]);
  expect(detectYaku({ hand, winTile: "8p", riichi: "none", uraDora: ["8p"] })).toStrictEqual([{ name: "tanyao", han: 1 }]);
});

test("赤5は1枚につき赤ドラ1翻として付く", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "3p", "4p", "0p", "6s", "7s", "8s", "0s", "5s", "5s", "8p", "8p"], winTile: "8p" }),
  ).toStrictEqual([
    { name: "tanyao", han: 1 },
    { name: "aka_dora", han: 2 },
  ]);
});

test("副露に含まれる赤5も赤ドラとして数える", () => {
  const ponWithRed = Meld.create("pon", ["0s", "5s", "5s"]);
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "3p", "4p", "5p", "6s", "7s", "8s", "8p", "8p"], melds: ponWithRed ? [ponWithRed] : [], winTile: "8p" }),
  ).toStrictEqual([
    { name: "tanyao", han: 1 },
    { name: "aka_dora", han: 1 },
  ]);
});

test("ドラだけでは役にならない", () => {
  expect(
    detectYaku({ hand: ["1m", "2m", "3m", "3p", "3p", "3p", "6s", "7s", "8s", "9p", "9p"], melds: [pon("pei")], winTile: "9p", dora: ["3p", "9p"] }),
  ).toStrictEqual([]);
});

test("ドラ・裏ドラ・赤ドラは役の後にこの順で並ぶ", () => {
  expect(
    detectYaku({
      hand: ["2m", "3m", "4m", "3p", "4p", "0p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"],
      winTile: "8p",
      riichi: "riichi",
      dora: ["2m"],
      uraDora: ["8p"],
    }),
  ).toStrictEqual([
    { name: "riichi", han: 1 },
    { name: "tanyao", han: 1 },
    { name: "dora", han: 1 },
    { name: "ura_dora", han: 2 },
    { name: "aka_dora", han: 1 },
  ]);
});
