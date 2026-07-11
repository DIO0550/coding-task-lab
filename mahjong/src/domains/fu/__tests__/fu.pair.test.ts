import { expect, test } from "vitest";
import type { WinContext } from "../../win-context/index.ts";
import { Fu } from "../index.ts";
import { kotsu, pair, shuntsu, standardContext } from "./fixtures.ts";

type Wind = WinContext["seatWind"];

/**
 * 全順子・両面待ちの面前ロン(副底20+門前ロン10=30符)を土台に、
 * 雀頭と風だけを変えて雀頭符を検証する
 */
const ronWithPair = (pairNotation: string, seatWind: Wind, roundWind: Wind) =>
  standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
      shuntsu("4s", "5s", "6s"),
    ],
    pair: pair(pairNotation),
    agari: { target: "group", index: 1 },
    winTile: "4p",
    winType: "ron",
    seatWind,
    roundWind,
  });

test("三元牌の雀頭には2符が加算される", () => {
  // 20+10+2=32→40符
  const ctx = ronWithPair("haku", "nan", "ton");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("自風牌の雀頭には2符が加算される", () => {
  // 自風=西: 20+10+2=32→40符
  const ctx = ronWithPair("sha", "sha", "ton");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("場風牌の雀頭には2符が加算される", () => {
  // 場風=東: 20+10+2=32→40符
  const ctx = ronWithPair("ton", "nan", "ton");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("連風牌の雀頭は4符ではなく2符に留まる", () => {
  // 東場の東家で東雀頭: 20+10(門前ロン)+8(幺九暗刻)+2(連風雀頭)=40符ちょうど
  // (連風4符説を採ると42→50符になる)
  const ctx = standardContext({
    groups: [
      kotsu("1s"),
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("5s", "6s", "7s"),
    ],
    pair: pair("ton"),
    agari: { target: "group", index: 2 },
    winTile: "4p",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("場風でも自風でもない客風の雀頭には符が付かない", () => {
  // 東場・南家の西雀頭: 20+10=30符
  const ctx = ronWithPair("sha", "nan", "ton");
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("数牌の雀頭には符が付かない", () => {
  // 20+10=30符
  const ctx = ronWithPair("8m", "nan", "ton");
  expect(Fu.calculate(ctx, [])).toBe(30);
});
