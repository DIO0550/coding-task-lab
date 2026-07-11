import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import {
  chiitoitsuContext,
  hanOf,
  namesOf,
  pair,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("7種の対子で構成された手は七対子2翻のみとして検出される", () => {
  const ctx = chiitoitsuContext({
    pairs: ["1m", "4m", "6p", "8p", "3s", "5s", "ton"],
    agari: { target: "pair", index: 6 },
    winTile: "ton",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(Yaku.detect(ctx)).toStrictEqual([{ name: "chiitoitsu", han: 2 }]);
});

test("数牌2〜8だけの七対子は断幺九と複合する", () => {
  const ctx = chiitoitsuContext({
    pairs: ["2m", "4m", "6p", "8p", "3s", "5s", "7s"],
    agari: { target: "pair", index: 6 },
    winTile: "7s",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chiitoitsu")).toBe(2);
  expect(hanOf(results, "tanyao")).toBe(1);
});

test("七対子のツモ和了は門前清自摸和と複合する", () => {
  const ctx = chiitoitsuContext({
    pairs: ["1m", "4m", "6p", "8p", "3s", "5s", "ton"],
    agari: { target: "pair", index: 6 },
    winTile: "ton",
    winType: "tsumo",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chiitoitsu")).toBe(2);
  expect(hanOf(results, "menzen_tsumo")).toBe(1);
});

test("4面子1雀頭の通常形に七対子は付かない", () => {
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
  expect(namesOf(Yaku.detect(ctx))).not.toContain("chiitoitsu");
});

test("リーチした七対子はリーチと複合する", () => {
  const ctx = chiitoitsuContext({
    pairs: ["1m", "4m", "6p", "8p", "3s", "5s", "ton"],
    agari: { target: "pair", index: 6 },
    winTile: "ton",
    winType: "ron",
    riichi: "riichi",
    seatWind: "nan",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "chiitoitsu")).toBe(2);
  expect(hanOf(results, "riichi")).toBe(1);
});
