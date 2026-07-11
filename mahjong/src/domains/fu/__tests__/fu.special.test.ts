import { expect, test } from "vitest";
import { Fu } from "../index.ts";
import {
  chiitoitsuContext,
  pair,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

/** 平和形(全順子・数牌雀頭・両面待ち)の面前手 */
const pinfuContext = (winType: "tsumo" | "ron") =>
  standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("6s", "7s", "8s"),
      shuntsu("2s", "3s", "4s"),
    ],
    pair: pair("8p"),
    agari: { target: "group", index: 3 },
    winTile: "2s",
    winType,
  });

/** 七対子(和了牌は白の単騎) */
const chiitoitsuWin = (winType: "tsumo" | "ron") =>
  chiitoitsuContext({
    pairs: ["1m", "3m", "5p", "7p", "2s", "4s", "haku"],
    agari: { target: "pair", index: 6 },
    winTile: "haku",
    winType,
  });

test("平和のツモ和了は20符固定になる", () => {
  const ctx = pinfuContext("tsumo");
  const yakuList = [
    { name: "pinfu", han: 1 },
    { name: "menzen_tsumo", han: 1 },
  ];
  expect(Fu.calculate(ctx, yakuList)).toBe(20);
});

test("平和のロン和了は30符になる", () => {
  // 副底20+門前ロン10
  const ctx = pinfuContext("ron");
  expect(Fu.calculate(ctx, [{ name: "pinfu", han: 1 }])).toBe(30);
});

test("七対子は25符固定になる", () => {
  const ctx = chiitoitsuWin("tsumo");
  const yakuList = [
    { name: "chiitoitsu", han: 2 },
    { name: "menzen_tsumo", han: 1 },
  ];
  expect(Fu.calculate(ctx, yakuList)).toBe(25);
});

test("七対子はロン和了でも25符のまま切り上げられない", () => {
  const ctx = chiitoitsuWin("ron");
  expect(Fu.calculate(ctx, [{ name: "chiitoitsu", han: 2 }])).toBe(25);
});
