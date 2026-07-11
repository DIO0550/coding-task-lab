import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  chi,
  hanOf,
  namesOf,
  pair,
  pon,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("リーチ宣言した面前手の和了にはリーチ1翻が付く", () => {
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
    riichi: "riichi",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "riichi")).toBe(1);
  expect(namesOf(results)).not.toContain("double_riichi");
});

test("ダブルリーチは2翻で、リーチとは併記されない", () => {
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
    riichi: "double",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "double_riichi")).toBe(2);
  expect(namesOf(results)).not.toContain("riichi");
});

test("リーチ後の一発和了には一発1翻が付く", () => {
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
    riichi: "riichi",
    ippatsu: true,
  });
  expect(hanOf(Yaku.detect(ctx), "ippatsu")).toBe(1);
});

test("リーチしていない手の一発申告は無視される", () => {
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
    riichi: "none",
    ippatsu: true,
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("ippatsu");
});

test("面前のツモ和了には門前清自摸和1翻が付く", () => {
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
  expect(hanOf(Yaku.detect(ctx), "menzen_tsumo")).toBe(1);
});

test("面前のロン和了に門前清自摸和は付かない", () => {
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
  expect(namesOf(Yaku.detect(ctx))).not.toContain("menzen_tsumo");
});

test("チーした手のツモ和了に門前清自摸和は付かない", () => {
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
    winType: "tsumo",
  });
  expect(namesOf(Yaku.detect(ctx))).not.toContain("menzen_tsumo");
});

test("副露した手のリーチ・一発申告は無視される", () => {
  const ctx = standardContext({
    groups: [
      shuntsu("4p", "5p", "6p"),
      shuntsu("3s", "4s", "5s"),
      shuntsu("6s", "7s", "8s"),
      pon("2m"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 0 },
    winTile: "4p",
    winType: "ron",
    riichi: "riichi",
    ippatsu: true,
  });
  const names = namesOf(Yaku.detect(ctx));
  expect(names).not.toContain("riichi");
  expect(names).not.toContain("ippatsu");
});
