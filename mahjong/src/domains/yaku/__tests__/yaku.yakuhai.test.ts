import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  hanOf,
  kotsu,
  namesOf,
  pair,
  pon,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("白の刻子には役牌(白)1翻が付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      kotsu("haku"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "haku")).toBe(1);
});

test("發のポンでも役牌(發)1翻が付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      pon("hatsu"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "hatsu")).toBe(1);
});

test("中の刻子には役牌(中)1翻が付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      kotsu("chun"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "chun")).toBe(1);
});

test("三元牌の刻子が2つあれば役牌が2エントリ付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      kotsu("haku"),
      kotsu("hatsu"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "haku")).toBe(1);
  expect(hanOf(results, "hatsu")).toBe(1);
});

test("場風の刻子には場風牌1翻が付き自風牌は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      kotsu("ton"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "round_wind")).toBe(1);
  expect(namesOf(results)).not.toContain("seat_wind");
});

test("自風の刻子には自風牌1翻が付き場風牌は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      kotsu("nan"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "seat_wind")).toBe(1);
  expect(namesOf(results)).not.toContain("round_wind");
});

test("ダブル東(場風=自風)の刻子は場風牌と自風牌の両方が付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      kotsu("ton"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "round_wind")).toBe(1);
  expect(hanOf(results, "seat_wind")).toBe(1);
});

test("客風牌の刻子に役牌は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      kotsu("sha"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const names = namesOf(Yaku.detect(ctx));
  expect(names).not.toContain("round_wind");
  expect(names).not.toContain("seat_wind");
});

test("三元牌の雀頭だけでは役牌は付かない", () => {
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
  expect(namesOf(Yaku.detect(ctx))).not.toContain("haku");
});

test("中の雀頭だけでは役牌(中)は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("chun"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("chun");
});
