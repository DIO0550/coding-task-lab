import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  ankan,
  hanOf,
  kotsu,
  minkan,
  namesOf,
  pair,
  pon,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("4面子すべて刻子の手には対々和2翻が付く", () => {
  const ctx = standardContext({
    groups: [kotsu("4s"), kotsu("6s"), pon("2m"), pon("3p")],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4s",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "toitoi")).toBe(2);
});

test("順子を含む手に対々和は付かない", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), shuntsu("5m", "6m", "7m"), kotsu("3p"), kotsu("4s")],
    pair: pair("8p"),
    agari: { target: "group", index: 1 },
    winTile: "5m",
    winType: "tsumo",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("toitoi");
});

test("暗刻3つの手には三暗刻2翻が付く", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), shuntsu("5m", "6m", "7m"), kotsu("3p"), kotsu("4s")],
    pair: pair("8p"),
    agari: { target: "group", index: 1 },
    winTile: "5m",
    winType: "tsumo",
  });
  expect(hanOf(Yaku.detect(ctx), "sanankou")).toBe(2);
});

test("順子で和了するロンなら手中の暗刻3つは崩れず三暗刻が付く", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), shuntsu("5m", "6m", "7m"), kotsu("3p"), kotsu("4s")],
    pair: pair("8p"),
    agari: { target: "group", index: 1 },
    winTile: "5m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "sanankou")).toBe(2);
});

test("ロンで完成した刻子は明刻扱いになり三暗刻が崩れる", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), shuntsu("5m", "6m", "7m"), kotsu("3p"), kotsu("4s")],
    pair: pair("8p"),
    agari: { target: "group", index: 2 },
    winTile: "3p",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("sanankou");
});

test("同じ刻子でもツモで完成すれば暗刻に数え三暗刻が付く", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), shuntsu("5m", "6m", "7m"), kotsu("3p"), kotsu("4s")],
    pair: pair("8p"),
    agari: { target: "group", index: 2 },
    winTile: "3p",
    winType: "tsumo",
  });
  expect(hanOf(Yaku.detect(ctx), "sanankou")).toBe(2);
});

test("暗刻4つをシャンポンロンすると三暗刻+対々和になる", () => {
  const ctx = standardContext({
    groups: [kotsu("2m"), kotsu("3p"), kotsu("4s"), kotsu("5s")],
    pair: pair("8m"),
    agari: { target: "group", index: 3 },
    winTile: "5s",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "sanankou")).toBe(2);
  expect(hanOf(results, "toitoi")).toBe(2);
});

test("カンが3つの手には三槓子2翻が付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2s", "3s", "4s"),
      ankan("1m"),
      minkan("5p"),
      ankan("9s"),
    ],
    pair: pair("3m"),
    agari: { target: "group", index: 0 },
    winTile: "3s",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "sankantsu")).toBe(2);
});

test("カンが2つの手に三槓子は付かない", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2s", "3s", "4s"),
      shuntsu("5m", "6m", "7m"),
      ankan("1m"),
      minkan("5p"),
    ],
    pair: pair("3m"),
    agari: { target: "group", index: 0 },
    winTile: "3s",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("sankantsu");
});

test("3色で同じ数の刻子が揃うと三色同刻2翻が付く", () => {
  const ctx = standardContext({
    groups: [
      kotsu("2m"),
      shuntsu("4m", "5m", "6m"),
      kotsu("2p"),
      kotsu("2s"),
    ],
    pair: pair("8p"),
    agari: { target: "group", index: 1 },
    winTile: "5m",
    winType: "ron",
  });
  expect(hanOf(Yaku.detect(ctx), "sanshoku_doukou")).toBe(2);
});

test("三色同刻は鳴いても2翻のまま(食い下がりなし)", () => {
  const ctx = standardContext({
    groups: [
      kotsu("2m"),
      shuntsu("4m", "5m", "6m"),
      kotsu("2s"),
      pon("2p"),
    ],
    pair: pair("8p"),
    agari: { target: "group", index: 1 },
    winTile: "5m",
    winType: "tsumo",
  });
  expect(hanOf(Yaku.detect(ctx), "sanshoku_doukou")).toBe(2);
});

test("2色だけの同数刻子に三色同刻は付かない", () => {
  const ctx = standardContext({
    groups: [
      kotsu("2m"),
      kotsu("2p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("8p"),
    agari: { target: "group", index: 2 },
    winTile: "4s",
    winType: "ron",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("sanshoku_doukou");
});

test("三元牌2種の刻子+三元牌の雀頭は小三元2翻と役牌2つが付く", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("2m", "3m", "4m"),
      shuntsu("4p", "5p", "6p"),
      kotsu("haku"),
      kotsu("hatsu"),
    ],
    pair: pair("chun"),
    agari: { target: "group", index: 0 },
    winTile: "4m",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "shousangen")).toBe(2);
  expect(hanOf(results, "haku")).toBe(1);
  expect(hanOf(results, "hatsu")).toBe(1);
});

test("三元牌の刻子2つでも雀頭が三元牌でなければ小三元は付かない", () => {
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
  expect(namesOf(Yaku.detect(ctx))).not.toContain("shousangen");
});
