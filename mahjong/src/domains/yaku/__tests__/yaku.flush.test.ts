import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  chi,
  chiitoitsuContext,
  hanOf,
  kotsu,
  namesOf,
  pair,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("1色の数牌+字牌の面前手は混一色3翻になる", () => {
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("5m", "6m", "7m"),
      kotsu("pei"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 1 },
    winTile: "2m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "honitsu")).toBe(3);
  expect(namesOf(results)).not.toContain("chinitsu");
});

test("鳴いた混一色は食い下がりで2翻になる", () => {
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      shuntsu("5m", "6m", "7m"),
      kotsu("pei"),
      chi("2m", "3m", "4m"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 1 },
    winTile: "5m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(hanOf(Yaku.detect(ctx), "honitsu")).toBe(2);
});

test("1色の数牌だけの面前手は清一色6翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("3m", "4m", "5m"),
      shuntsu("4m", "5m", "6m"),
    ],
    pair: pair("9m"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chinitsu")).toBe(6);
  expect(namesOf(results)).not.toContain("honitsu");
});

test("鳴いた清一色は食い下がりで5翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("3m", "4m", "5m"),
      shuntsu("4m", "5m", "6m"),
      chi("1m", "2m", "3m"),
    ],
    pair: pair("9m"),
    agari: { target: "group", index: 0 },
    winTile: "3m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "chinitsu")).toBe(5);
});

test("2色以上の数牌を含む手に混一色も清一色も付かない", () => {
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
  const names = namesOf(Yaku.detect(ctx));
  expect(names).not.toContain("honitsu");
  expect(names).not.toContain("chinitsu");
});

test("1色の数牌+字牌の七対子は七対子2翻と混一色3翻が複合する", () => {
  const ctx = chiitoitsuContext({
    pairs: ["1m", "3m", "5m", "7m", "9m", "ton", "haku"],
    agari: { target: "pair", index: 2 },
    winTile: "5m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chiitoitsu")).toBe(2);
  expect(hanOf(results, "honitsu")).toBe(3);
});
