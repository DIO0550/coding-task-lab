import { expect, test } from "vitest";

import { outcomeOf, summaryOf } from "./score-fixture.ts";

const YAKUHAI_HAND = "2m 3m 4m 5p 6p 7p 8s 8s 8s chun chun chun 9m 9m";
const PINFU_HAND = "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p";

test("ロン和了では1本場につき300点が加算される", () => {
  const outcome = outcomeOf({
    hand: YAKUHAI_HAND,
    winTile: "9m",
    honba: 2,
  });
  expect(summaryOf(outcome)?.total).toBe(2200);
});

test("ロン和了の本場は放銃者の支払いに含まれる", () => {
  const outcome = outcomeOf({
    hand: YAKUHAI_HAND,
    winTile: "9m",
    honba: 2,
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: { score: { payments: [{ from: "discarder", amount: 2200 }] } },
  });
});

test("ツモ和了では1本場につき各家100点ずつ加算される", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    winType: "tsumo",
    honba: 1,
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: {
      score: {
        total: 1800,
        payments: [
          { from: "dealer", amount: 800 },
          { from: "non_dealer", amount: 500 },
          { from: "non_dealer", amount: 500 },
        ],
      },
    },
  });
});

test("供託のリーチ棒は1本につき1000点が和了者に加算される", () => {
  const outcome = outcomeOf({
    hand: YAKUHAI_HAND,
    winTile: "9m",
    riichiSticks: 2,
  });
  expect(summaryOf(outcome)?.total).toBe(3600);
});

test("供託は放銃者の支払いには含まれない", () => {
  const outcome = outcomeOf({
    hand: YAKUHAI_HAND,
    winTile: "9m",
    riichiSticks: 2,
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: { score: { payments: [{ from: "discarder", amount: 1600 }] } },
  });
});

test("本場と供託は同時に加算される", () => {
  const outcome = outcomeOf({
    hand: YAKUHAI_HAND,
    winTile: "9m",
    honba: 3,
    riichiSticks: 1,
  });
  expect(summaryOf(outcome)?.total).toBe(3500);
});
