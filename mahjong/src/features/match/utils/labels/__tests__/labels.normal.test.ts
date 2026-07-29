import { expect, test } from "vitest";

import { Tile } from "../../../../../domains/tile/index.ts";
import {
  actionLabel,
  cpuLevelLabel,
  dealerContinuesLabel,
  matchLengthLabel,
  pointDeltaLabel,
  pointsLabel,
  roundLabel,
  scoreLimitLabel,
  tenpaiLabel,
  tileLabel,
  windLabel,
  yakuLabel,
} from "../index.ts";

test.each([
  ["3m", "三萬"],
  ["5p", "五筒"],
  ["0p", "赤五筒"],
  ["9s", "九索"],
  ["ton", "東"],
  ["hatsu", "發"],
  ["chun", "中"],
])("牌 %s は %s と表記される", (code, expected) => {
  const tile = Tile.fromCode(code);
  expect(tile).not.toBeNull();
  expect(tileLabel(tile as Tile)).toBe(expected);
});

test.each([
  ["ton", 1, "東一局"],
  ["ton", 4, "東四局"],
  ["nan", 4, "南四局"],
] as const)("%s の %i 局目は %s と表記される", (wind, number, expected) => {
  expect(roundLabel(wind, number)).toBe(expected);
});

test.each([
  ["ton", "東"],
  ["nan", "南"],
  ["sha", "西"],
  ["pei", "北"],
] as const)("風 %s は %s と表記される", (wind, expected) => {
  expect(windLabel(wind)).toBe(expected);
});

test.each([
  ["mangan", "満貫"],
  ["haneman", "跳満"],
  ["baiman", "倍満"],
  ["sanbaiman", "三倍満"],
  ["kazoe_yakuman", "数え役満"],
  ["yakuman", "役満"],
] as const)("点数区分 %s は %s と表記される", (limit, expected) => {
  expect(scoreLimitLabel(limit)).toBe(expected);
});

test("点数区分なしの手には区分の表記がない", () => {
  expect(scoreLimitLabel("none")).toBeNull();
});

test.each([
  ["riichi", "立直"],
  ["pinfu", "平和"],
  ["menzen_tsumo", "門前清自摸和"],
  ["kokushi_musou", "国士無双"],
  ["dora", "ドラ"],
  ["aka_dora", "赤ドラ"],
] as const)("役 %s は %s と表記される", (name, expected) => {
  expect(yakuLabel(name)).toBe(expected);
});

test.each([
  ["tsumo", "ツモ"],
  ["ron", "ロン"],
  ["riichi", "リーチ"],
  ["chi", "チー"],
  ["pon", "ポン"],
  ["ankan", "カン"],
  ["kakan", "カン"],
  ["minkan", "カン"],
  ["pass", "パス"],
] as const)("行動 %s のボタン文言は %s になる", (type, expected) => {
  expect(actionLabel(type)).toBe(expected);
});

test("持ち点は3桁区切りで表記される", () => {
  expect(pointsLabel(25000)).toBe("25,000点");
});

test.each([
  [8000, "+8,000"],
  [-8000, "-8,000"],
  [0, "±0"],
])("点数移動 %i は %s と表記される", (delta, expected) => {
  expect(pointDeltaLabel(delta)).toBe(expected);
});

test.each([
  ["beginner", "入門"],
  ["standard", "標準"],
  ["advanced", "上級"],
] as const)("CPUレベル %s は %s と表記される", (level, expected) => {
  expect(cpuLevelLabel(level)).toBe(expected);
});

test.each([
  ["tonpuu", "東風戦"],
  ["hanchan", "半荘戦"],
] as const)("対戦形式 %s は %s と表記される", (length, expected) => {
  expect(matchLengthLabel(length)).toBe(expected);
});

test("親が継続するときは連荘と表記される", () => {
  expect(dealerContinuesLabel(true)).toBe("連荘");
});

test("親が交代するときは輪荘と表記される", () => {
  expect(dealerContinuesLabel(false)).toBe("輪荘");
});

test.each([
  [true, "テンパイ"],
  [false, "ノーテン"],
])("テンパイ状態 %s は %s と表記される", (tenpai, expected) => {
  expect(tenpaiLabel(tenpai)).toBe(expected);
});
