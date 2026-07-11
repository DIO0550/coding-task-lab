import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  ankan,
  kokushiContext,
  kotsu,
  minkan,
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

test("白發中すべて刻子の手は大三元として検出される", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      kotsu("haku"),
      kotsu("hatsu"),
      pon("chun"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "daisangen", han: 13 },
  ]);
});

test("役満が成立した手の通常役検出は空になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      kotsu("haku"),
      kotsu("hatsu"),
      pon("chun"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(Yaku.detect(ctx)).toStrictEqual([]);
});

test("風牌3種の刻子+残り風牌の雀頭は小四喜として検出される", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2p", "3p", "4p"),
      kotsu("ton"),
      kotsu("nan"),
      kotsu("sha"),
    ],
    pair: pair("pei"),
    agari: { target: "group", index: 0 },
    winTile: "3p",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "shousuushi", han: 13 },
  ]);
});

test("全牌が字牌の手は字一色として検出される", () => {
  const ctx = standardContext({
    groups: [kotsu("ton"), kotsu("nan"), pon("haku"), pon("hatsu")],
    pair: pair("chun"),
    agari: { target: "group", index: 0 },
    winTile: "ton",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "tsuuiisou", han: 13 },
  ]);
});

test("全牌が数牌の1と9の手は清老頭として検出される", () => {
  const ctx = standardContext({
    groups: [kotsu("1m"), kotsu("9m"), kotsu("1p"), pon("9s")],
    pair: pair("1s"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "chinroutou", han: 13 },
  ]);
});

test("發を含む緑一色が検出される", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2s", "3s", "4s"),
      kotsu("6s"),
      kotsu("8s"),
      pon("hatsu"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "3s",
    winType: "tsumo",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "ryuuiisou", han: 13 },
  ]);
});

test("發のない緑一色も役満として成立する", () => {
  const ctx = standardContext({
    groups: [
      kotsu("2s"),
      shuntsu("2s", "3s", "4s"),
      kotsu("6s"),
      kotsu("8s"),
    ],
    pair: pair("3s"),
    agari: { target: "group", index: 1 },
    winTile: "4s",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "ryuuiisou", han: 13 },
  ]);
});

test("カン4つの手は四槓子として検出される", () => {
  const ctx = standardContext({
    groups: [ankan("2m"), minkan("5p"), ankan("7s"), minkan("9s")],
    pair: pair("3m"),
    agari: { target: "pair", index: 0 },
    winTile: "3m",
    winType: "tsumo",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "suukantsu", han: 13 },
  ]);
});

test("単騎待ちで和了した国士無双は単役満として検出される", () => {
  const ctx = kokushiContext({
    tiles: [...KOKUSHI_13_KINDS, "ton"],
    pairTile: "ton",
    agari: { target: "pair", index: 0 },
    winTile: "chun",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([{ name: "kokushi", han: 13 }]);
});

test("天和の申告がある和了は天和として検出され通常役は返さない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "tsumo",
    seatWind: "ton",
    roundWind: "ton",
    situational: ["tenhou"],
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([{ name: "tenhou", han: 13 }]);
  expect(Yaku.detect(ctx)).toStrictEqual([]);
});

test("地和の申告がある和了は地和として検出される", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "tsumo",
    seatWind: "nan",
    roundWind: "ton",
    situational: ["chihou"],
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([{ name: "chihou", han: 13 }]);
});

test("役満でない手の役満検出は空になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([]);
});
