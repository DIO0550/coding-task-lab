import { expect, test } from "vitest";

import { outcomeOf, summaryOf, yakuNames } from "./score-fixture.ts";

/** 七対子とも二盃口とも解釈できる手。 */
const AMBIGUOUS_HAND = "1m 1m 2m 2m 3m 3m 5p 5p 6p 6p 7p 7p 9s 9s";

test("七対子と二盃口の両方に解釈できる手は二盃口が採用される", () => {
  const outcome = outcomeOf({ hand: AMBIGUOUS_HAND, winTile: "3m" });
  expect(yakuNames(outcome)).toContain("ryanpeikou");
});

test("二盃口として解釈した方が高いため3翻40符5200点になる", () => {
  const outcome = outcomeOf({ hand: AMBIGUOUS_HAND, winTile: "3m" });
  expect(summaryOf(outcome)).toStrictEqual({ han: 3, fu: 40, total: 5200 });
});

test("辺張とも両面とも解釈できる待ちは平和が成立する方が採用される", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 3m 4m 5m 2p 3p 4p 5s 6s 7s 9p 9p",
    winTile: "3m",
  });
  expect(yakuNames(outcome)).toContain("pinfu");
});

test("平和が成立する解釈が採られるため1翻30符1000点になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 3m 4m 5m 2p 3p 4p 5s 6s 7s 9p 9p",
    winTile: "3m",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 1, fu: 30, total: 1000 });
});

test("符が高くなる解釈がある場合は高い方が採用される", () => {
  const outcome = outcomeOf({
    hand: "2m 2m 2m 3m 3m 3m 4m 4m 4m 6p 7p 8p 9s 9s",
    winTile: "2m",
    winType: "tsumo",
  });
  expect(summaryOf(outcome)?.fu).toBe(40);
});

test("三暗刻として解釈した方が高いため翻数が増える", () => {
  const outcome = outcomeOf({
    hand: "2m 2m 2m 3m 3m 3m 4m 4m 4m 6p 7p 8p 9s 9s",
    winTile: "2m",
    winType: "tsumo",
  });
  expect(yakuNames(outcome)).toContain("sanankou");
});
