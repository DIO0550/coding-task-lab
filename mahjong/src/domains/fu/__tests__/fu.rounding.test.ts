import { expect, test } from "vitest";
import { Fu } from "../index.ts";
import { chi, pair, shuntsu, standardContext } from "./fixtures.ts";

test("符の合計は10符単位に切り上げられる", () => {
  // 20+10(門前ロン)+2(役牌雀頭)+2(嵌張)=34→40符
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
      shuntsu("4s", "5s", "6s"),
    ],
    pair: pair("haku"),
    agari: { target: "group", index: 3 },
    winTile: "5s",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("合計がちょうど10符単位のときは切り上げられない", () => {
  // 20+10(門前ロン)=30符ちょうど
  const ctx = standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
      shuntsu("4s", "5s", "6s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 1 },
    winTile: "4p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("喰い平和形のロンは20符ではなく30符に引き上げられる", () => {
  // チーを含み内訳が副底20符のみ(両面・数牌雀頭・鳴きロン)→20符ロンは存在しないため30符
  const ctx = standardContext({
    groups: [
      chi("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
      shuntsu("4s", "5s", "6s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 1 },
    winTile: "4p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("喰い平和形のツモは22符となり30符に切り上げられる", () => {
  // 20+2(ツモ)=22→30符(引き上げ規則ではなく自然な切り上げ)
  const ctx = standardContext({
    groups: [
      chi("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
      shuntsu("4s", "5s", "6s"),
    ],
    pair: pair("8m"),
    agari: { target: "group", index: 1 },
    winTile: "4p",
    winType: "tsumo",
  });
  expect(Fu.calculate(ctx, [])).toBe(30);
});
