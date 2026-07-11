import { expect, test } from "vitest";
import type { WinContext } from "../../win-context/index.ts";
import { Fu } from "../index.ts";
import { kotsu, pair, shuntsu, standardContext } from "./fixtures.ts";

/**
 * 全順子・数牌雀頭の面前ロン(副底20+門前ロン10=30符)を土台に、
 * 和了位置だけを変えて待ち符を検証する
 */
const allShuntsuRon = (agari: WinContext["agari"], winTile: string) =>
  standardContext({
    groups: [
      shuntsu("1m", "2m", "3m"),
      shuntsu("4p", "5p", "6p"),
      shuntsu("7s", "8s", "9s"),
      shuntsu("4s", "5s", "6s"),
    ],
    pair: pair("8m"),
    agari,
    winTile,
    winType: "ron",
  });

test("両面待ちには待ち符が付かない", () => {
  // 456p を 4p で完成: 20+10=30符
  const ctx = allShuntsuRon({ target: "group", index: 1 }, "4p");
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("嵌張待ちは2符が加算される", () => {
  // 456s を中央の 5s で完成: 20+10+2=32→40符
  const ctx = allShuntsuRon({ target: "group", index: 3 }, "5s");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("123の順子を3で完成させた辺張待ちは2符が加算される", () => {
  // 20+10+2=32→40符
  const ctx = allShuntsuRon({ target: "group", index: 0 }, "3m");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("789の順子を7で完成させた辺張待ちは2符が加算される", () => {
  // 20+10+2=32→40符
  const ctx = allShuntsuRon({ target: "group", index: 2 }, "7s");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("123の順子を1で完成させた場合は両面待ちで待ち符が付かない", () => {
  // 20+10=30符
  const ctx = allShuntsuRon({ target: "group", index: 0 }, "1m");
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("789の順子を9で完成させた場合は両面待ちで待ち符が付かない", () => {
  // 20+10=30符
  const ctx = allShuntsuRon({ target: "group", index: 2 }, "9s");
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("単騎待ちは2符が加算される", () => {
  // 雀頭 8m を単騎で完成: 20+10+2=32→40符
  const ctx = allShuntsuRon({ target: "pair", index: 0 }, "8m");
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("シャンポン待ち(刻子での和了)には待ち符が付かない", () => {
  // 20+10(門前ロン)+4(ロン完成の幺九明刻)+4(中張暗刻)+2(役牌雀頭)+0(待ち)=40符ちょうど
  // (シャンポンに2符を付けると42→50符になる)
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      kotsu("6p"),
      shuntsu("2s", "3s", "4s"),
      shuntsu("5m", "6m", "7m"),
    ],
    pair: pair("haku"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});
