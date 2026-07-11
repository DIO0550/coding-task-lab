import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  chi,
  hanOf,
  namesOf,
  pair,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("全牌が数牌2〜8の手には断幺九1翻が付く", () => {
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
  expect(hanOf(Yaku.detect(ctx), "tanyao")).toBe(1);
});

test("チーした手でも断幺九が成立する(喰いタン)", () => {
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
  expect(hanOf(Yaku.detect(ctx), "tanyao")).toBe(1);
});

test("9を含む手に断幺九は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("7s", "8s", "9s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("tanyao");
});

test("面前で同一順子が2つあれば一盃口1翻が付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "iipeiko")).toBe(1);
});

test("副露した手に一盃口は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      chi("6s", "7s", "8s"),
    ],
    pair: pair("8s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("iipeiko");
});

test("同一順子の組が2組あれば二盃口3翻になり一盃口は併記されない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("6p", "7p", "8p"),
      shuntsu("6p", "7p", "8p"),
    ],
    pair: pair("5s"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "ryanpeiko")).toBe(3);
  expect(namesOf(results)).not.toContain("iipeiko");
});

test("3色で同じ数の順子が揃うと面前の三色同順は2翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("6m", "7m", "8m"),
      shuntsu("2p", "3p", "4p"),
      shuntsu("2s", "3s", "4s"),
    ],
    pair: pair("5p"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "sanshoku")).toBe(2);
});

test("鳴いた三色同順は食い下がりで1翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("6m", "7m", "8m"),
      shuntsu("2p", "3p", "4p"),
      chi("2s", "3s", "4s"),
    ],
    pair: pair("5p"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "sanshoku")).toBe(1);
});

test("数の違う3色の順子に三色同順は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("6m", "7m", "8m"),
      shuntsu("2p", "3p", "4p"),
      shuntsu("3s", "4s", "5s"),
    ],
    pair: pair("5p"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("sanshoku");
});

test("同一色の123・456・789が揃うと面前の一気通貫は2翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4m", "5m", "6m"),
      shuntsu("7m", "8m", "9m"),
      shuntsu("2p", "3p", "4p"),
    ],
    pair: pair("8s"),
    agari: { target: "group", index: 3 },
    winTile: "4p",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "ittsu")).toBe(2);
});

test("鳴いた一気通貫は食い下がりで1翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("4m", "5m", "6m"),
      shuntsu("7m", "8m", "9m"),
      shuntsu("2p", "3p", "4p"),
      chi("1m", "2m", "3m"),
    ],
    pair: pair("8s"),
    agari: { target: "group", index: 2 },
    winTile: "4p",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "ittsu")).toBe(1);
});

test("色をまたいだ123・456・789に一気通貫は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
    ],
    pair: pair("8s"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("ittsu");
});
