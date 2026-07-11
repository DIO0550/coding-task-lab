import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  hanOf,
  kokushiContext,
  kotsu,
  namesOf,
  pair,
  pon,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

const KOKUSHI_13_KINDS = [
  "1m",
  "9m",
  "1p",
  "9p",
  "1s",
  "9s",
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
];

test("13面待ちで和了した国士無双は国士十三面26翻になる", () => {
  const ctx = kokushiContext({
    tiles: [...KOKUSHI_13_KINDS, "ton"],
    pairTile: "ton",
    agari: { target: "pair", index: 0 },
    winTile: "ton",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "kokushi_13", han: 26 },
  ]);
});

test("シャンポン待ちをツモった暗刻4つの手は四暗刻13翻になる", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), kotsu("3p"), kotsu("4s"), kotsu("5s")],
    pair: pair("8m"),
    agari: { target: "group", index: 3 },
    winTile: "5s",
    winType: "tsumo",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "suuankou", han: 13 },
  ]);
});

test("単騎待ちをツモった暗刻4つの手は四暗刻単騎26翻になる", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), kotsu("3p"), kotsu("4s"), kotsu("5s")],
    pair: pair("8m"),
    agari: { target: "pair", index: 0 },
    winTile: "8m",
    winType: "tsumo",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "suuankou_tanki", han: 26 },
  ]);
});

test("単騎待ちはロンでも刻子が崩れず四暗刻単騎が成立する", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), kotsu("3p"), kotsu("4s"), kotsu("5s")],
    pair: pair("8m"),
    agari: { target: "pair", index: 0 },
    winTile: "8m",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "suuankou_tanki", han: 26 },
  ]);
});

test("シャンポン待ちのロンでは刻子が明刻扱いになり四暗刻は不成立になる", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), kotsu("3p"), kotsu("4s"), kotsu("5s")],
    pair: pair("8m"),
    agari: { target: "group", index: 3 },
    winTile: "5s",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([]);
});

test("風牌4種すべて刻子の手は大四喜26翻になり小四喜は併記されない", () => {
  const ctx = standardContext({
    groups: [kotsu("ton"), kotsu("nan"), kotsu("sha"), pon("pei")],
    pair: pair("2m"),
    agari: { target: "group", index: 0 },
    winTile: "ton",
    winType: "ron",
  });
  const results = Yaku.detectYakuman(ctx);
  expect(hanOf(results, "daisuushi")).toBe(26);
  expect(namesOf(results)).not.toContain("shousuushi");
});

test("字牌だけの大四喜は大四喜と字一色が複合する", () => {
  const ctx = standardContext({
    groups: [kotsu("ton"), kotsu("nan"), pon("sha"), pon("pei")],
    pair: pair("haku"),
    agari: { target: "group", index: 0 },
    winTile: "ton",
    winType: "ron",
  });
  const results = Yaku.detectYakuman(ctx);
  expect(hanOf(results, "daisuushi")).toBe(26);
  expect(hanOf(results, "tsuuiisou")).toBe(13);
  expect(Yaku.detect(ctx)).toStrictEqual([]);
});

test("九蓮宝燈の形で余剰牌以外の待ちで和了すると単役満になる", () => {
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("6m", "7m", "8m"),
      kotsu("9m"),
    ],
    pair: pair("5m"),
    agari: { target: "group", index: 1 },
    winTile: "2m",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([{ name: "chuuren", han: 13 }]);
});

test("純正九蓮宝燈(9面待ち)は26翻になる", () => {
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("6m", "7m", "8m"),
      kotsu("9m"),
    ],
    pair: pair("5m"),
    agari: { target: "pair", index: 0 },
    winTile: "5m",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "chuuren_9", han: 26 },
  ]);
});
