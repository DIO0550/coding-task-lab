import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import { hanOf, namesOf, pair, shuntsu, standardContext } from "./fixtures.ts";

test("海底牌のツモ和了には海底摸月1翻が付く", () => {
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
    situational: ["haitei"],
  });
  expect(hanOf(Yaku.detect(ctx), "haitei")).toBe(1);
});

test("ロン和了に海底摸月は付かない", () => {
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
    situational: ["haitei"],
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("haitei");
});

test("河底牌のロン和了には河底撈魚1翻が付く", () => {
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
    situational: ["houtei"],
  });
  expect(hanOf(Yaku.detect(ctx), "houtei")).toBe(1);
});

test("ツモ和了に河底撈魚は付かない", () => {
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
    situational: ["houtei"],
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("houtei");
});

test("嶺上牌のツモ和了には嶺上開花1翻が付く", () => {
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
    situational: ["rinshan"],
  });
  expect(hanOf(Yaku.detect(ctx), "rinshan")).toBe(1);
});

test("ロン和了に嶺上開花は付かない", () => {
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
    situational: ["rinshan"],
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("rinshan");
});

test("加槓牌へのロン和了には槍槓1翻が付く", () => {
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
    situational: ["chankan"],
  });
  expect(hanOf(Yaku.detect(ctx), "chankan")).toBe(1);
});

test("ツモ和了に槍槓は付かない", () => {
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
    situational: ["chankan"],
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("chankan");
});
