import { test, expect } from "vitest";

import { Labels } from "..";

test.each([
  ["1m", "一萬"],
  ["9p", "九筒"],
  ["5s", "五索"],
  ["0m", "赤五萬"],
  ["ton", "東"],
  ["hatsu", "發"],
] as const)("牌 %s は「%s」と表示される", (tile, label) => {
  expect(Labels.tile(tile)).toBe(label);
});

test("局名は場風と局数から東一局のように組み立てられる", () => {
  expect(Labels.round("ton", 1)).toBe("東一局");
  expect(Labels.round("nan", 4)).toBe("南四局");
});

test("持ち点は3桁区切りに「点」を付けて表示される", () => {
  expect(Labels.score(25000)).toBe("25,000点");
});

test("点数の増減は符号付きで表示される", () => {
  expect(Labels.delta(1300)).toBe("+1,300");
  expect(Labels.delta(-3900)).toBe("-3,900");
  expect(Labels.delta(0)).toBe("±0");
});

test("役名は日本語で表示される", () => {
  expect(Labels.yaku("pinfu")).toBe("平和");
  expect(Labels.yaku("kokushi_musou_13")).toBe("国士無双十三面待ち");
  expect(Labels.yaku("aka_dora")).toBe("赤ドラ");
});

test("満貫区分は日本語で表示され、区分なしは空文字になる", () => {
  expect(Labels.limit("mangan")).toBe("満貫");
  expect(Labels.limit("double_yakuman")).toBe("ダブル役満");
  expect(Labels.limit("none")).toBe("");
});

test("CPU レベル・操作種別・対戦形式は日本語で表示される", () => {
  expect(Labels.level("beginner")).toBe("入門");
  expect(Labels.kind("cpu")).toBe("CPU");
  expect(Labels.gameLength("tonpuu")).toBe("東風戦");
});
