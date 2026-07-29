import { expect, test } from "vitest";

import { Meld } from "../../../domains/meld/index.ts";
import { outcomeOf, tiles } from "./score-fixture.ts";

test("面子が揃わない手は not_winning_hand になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s ton nan sha 5m 5m",
    winTile: "5m",
  });
  expect(outcome).toStrictEqual({ type: "not_winning_hand" });
});

test("和了牌が手牌に含まれない場合は not_winning_hand になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m",
    winTile: "9p",
  });
  expect(outcome).toStrictEqual({ type: "not_winning_hand" });
});

test("枚数が足りない手は not_winning_hand になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m",
    winTile: "5m",
  });
  expect(outcome).toStrictEqual({ type: "not_winning_hand" });
});

test("門前でも役がなければ no_yaku になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 5p 6p 7p 1s 2s 3s 4m 5m 6m ton ton",
    winTile: "5m",
  });
  expect(outcome).toStrictEqual({ type: "no_yaku" });
});

test("副露した役なしの手は no_yaku になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 9s 9s 9s 1m 1m",
    melds: [Meld.chi(tiles("1s 2s 3s"), 3)],
    winTile: "4m",
  });
  expect(outcome).toStrictEqual({ type: "no_yaku" });
});

test("喰いタンなしのルールでは副露のタンヤオは認められない", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 3s 4s 5s 6m 6m",
    melds: [Meld.pon(tiles("8s 8s 8s"), 1)],
    winTile: "5p",
    options: { kuitan: false, atozuke: true },
  });
  expect(outcome).toStrictEqual({ type: "no_yaku" });
});

test("喰いタンありのルールでは副露のタンヤオが認められる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 3s 4s 5s 6m 6m",
    melds: [Meld.pon(tiles("8s 8s 8s"), 1)],
    winTile: "5p",
    options: { kuitan: true, atozuke: true },
  });
  expect(outcome).toMatchObject({ type: "scored" });
});

test("後付けなしのルールでは和了牌で役牌が確定する副露手は認められない", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p chun chun chun 9m 9m",
    melds: [Meld.chi(tiles("1s 2s 3s"), 3)],
    winTile: "chun",
    options: { kuitan: true, atozuke: false },
  });
  expect(outcome).toStrictEqual({ type: "no_yaku" });
});

test("後付けありのルールでは同じ手が役牌1翻で和了できる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p chun chun chun 9m 9m",
    melds: [Meld.chi(tiles("1s 2s 3s"), 3)],
    winTile: "chun",
    options: { kuitan: true, atozuke: true },
  });
  expect(outcome).toMatchObject({ type: "scored" });
});
