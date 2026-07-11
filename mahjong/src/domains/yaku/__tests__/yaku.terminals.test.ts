import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  chi,
  chiitoitsuContext,
  hanOf,
  kotsu,
  namesOf,
  pair,
  pon,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("全ブロックが幺九牌を含み字牌があると面前の混全帯幺九は2翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("7p", "8p", "9p"),
      shuntsu("1s", "2s", "3s"),
      kotsu("pei"),
    ],
    pair: pair("9s"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chanta")).toBe(2);
  expect(namesOf(results)).not.toContain("junchan");
});

test("鳴いた混全帯幺九は食い下がりで1翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("7p", "8p", "9p"),
      shuntsu("1s", "2s", "3s"),
      kotsu("pei"),
      chi("1m", "2m", "3m"),
    ],
    pair: pair("9s"),
    agari: { target: "group", index: 0 },
    winTile: "7p",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(hanOf(Yaku.detect(ctx), "chanta")).toBe(1);
});

test("中張牌だけの面子が混ざると混全帯幺九は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("1s", "2s", "3s"),
      kotsu("pei"),
    ],
    pair: pair("9s"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const names = namesOf(Yaku.detect(ctx));
  expect(names).not.toContain("chanta");
  expect(names).not.toContain("junchan");
});

test("全ブロックが老頭牌を含み字牌がないと面前の純全帯幺九は3翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("7m", "8m", "9m"),
      shuntsu("1p", "2p", "3p"),
      shuntsu("7s", "8s", "9s"),
    ],
    pair: pair("9p"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "junchan")).toBe(3);
  expect(namesOf(results)).not.toContain("chanta");
});

test("鳴いた純全帯幺九は食い下がりで2翻になる", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("7m", "8m", "9m"),
      shuntsu("1p", "2p", "3p"),
      shuntsu("7s", "8s", "9s"),
      chi("1m", "2m", "3m"),
    ],
    pair: pair("9p"),
    agari: { target: "group", index: 0 },
    winTile: "7m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "junchan")).toBe(2);
});

test("幺九牌の刻子だけの手は混老頭2翻と対々和2翻が付く", () => {
  const ctx = standardContext({
    groups: [kotsu("1m"), kotsu("9s"), kotsu("pei"), pon("1p")],
    pair: pair("9p"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "honroutou")).toBe(2);
  expect(hanOf(results, "toitoi")).toBe(2);
});

test("幺九牌のみの七対子は七対子2翻と混老頭2翻が複合する", () => {
  const ctx = chiitoitsuContext({
    pairs: ["1m", "9m", "1p", "9p", "1s", "9s", "ton"],
    agari: { target: "pair", index: 6 },
    winTile: "ton",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chiitoitsu")).toBe(2);
  expect(hanOf(results, "honroutou")).toBe(2);
});

test("順子を含む手に混老頭は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("7p", "8p", "9p"),
      shuntsu("1s", "2s", "3s"),
      kotsu("pei"),
    ],
    pair: pair("9s"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("honroutou");
});
