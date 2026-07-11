import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  chi,
  hanOf,
  kotsu,
  namesOf,
  pair,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("面前4順子・数牌雀頭・両面待ちのロンは平和1翻になる", () => {
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
  expect(hanOf(Yaku.detect(ctx), "pinfu")).toBe(1);
});

test("平和形はツモ和了でも平和が成立する", () => {
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
  });
  expect(hanOf(Yaku.detect(ctx), "pinfu")).toBe(1);
});

test("嵌張待ちの和了に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "3m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});

test("辺張待ち(123の3)の和了に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "3m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});

test("単騎待ちの和了に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "pair", index: 0 },
    winTile: "8m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});

test("刻子を含む手に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      kotsu("3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 1 },
    winTile: "4p",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});

test("三元牌が雀頭の手に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("haku"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});

test("客風牌の雀頭なら平和が成立する", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("sha"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(hanOf(Yaku.detect(ctx), "pinfu")).toBe(1);
});

test("自風牌が雀頭の手に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("nan"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});

test("チーした手に平和は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
      chi("2m", "3m", "4m"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4p",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("pinfu");
});
