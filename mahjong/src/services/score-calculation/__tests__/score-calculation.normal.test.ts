import { expect, test } from "vitest";

import { Meld } from "../../../domains/meld/index.ts";
import { outcomeOf, summaryOf, tiles, yakuNames } from "./score-fixture.ts";

test("順子3つと役牌の刻子で和了すると役牌1翻が成立する", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 8s 8s 8s chun chun chun 9m 9m",
    winTile: "9m",
  });
  expect(yakuNames(outcome)).toStrictEqual(["yakuhai_chun"]);
});

test("役牌のみの手はロンで1翻50符1600点になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 8s 8s 8s chun chun chun 9m 9m",
    winTile: "9m",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 1, fu: 50, total: 1600 });
});

test("場風と自風が重なる東の刻子は2翻になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m",
    winTile: "5m",
    seatWind: "ton",
    roundWind: "ton",
  });
  expect(yakuNames(outcome)).toStrictEqual([
    "yakuhai_round_wind",
    "yakuhai_seat_wind",
  ]);
});

test("門前で両面待ち・役牌でない雀頭・順子のみの手は平和になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
  });
  expect(yakuNames(outcome)).toContain("pinfu");
});

test("平和のツモ和了は20符2翻で1500点になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
    winType: "tsumo",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 2, fu: 20, total: 1500 });
});

test("七対子は2翻25符1600点になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 3m 3m 5p 5p 9p 9p 2s 2s ton ton chun chun",
    winTile: "chun",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 2, fu: 25, total: 1600 });
});

test("副露した中張牌のみの手は喰いタンとして1翻になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 3s 4s 5s 6m 6m",
    melds: [Meld.pon(tiles("8s 8s 8s"), 1)],
    winTile: "5p",
  });
  expect(yakuNames(outcome)).toStrictEqual(["tanyao"]);
});

test("喰いタンの手はロンで1翻30符1000点になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 3s 4s 5s 6m 6m",
    melds: [Meld.pon(tiles("8s 8s 8s"), 1)],
    winTile: "5p",
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 1, fu: 30, total: 1000 });
});

test("リーチ・一発・門前ツモ・平和は4翻20符5200点になる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
    winType: "tsumo",
    riichi: "riichi",
    ippatsu: true,
  });
  expect(summaryOf(outcome)).toStrictEqual({ han: 4, fu: 20, total: 5200 });
});

test("ダブルリーチは2翻として数えられる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
    riichi: "double",
  });
  expect(yakuNames(outcome)).toContain("double_riichi");
});

test("親のロンは子のロンより点数が高くなる", () => {
  const child = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 8s 8s 8s chun chun chun 9m 9m",
    winTile: "9m",
    seatWind: "nan",
  });
  const dealer = outcomeOf({
    hand: "2m 3m 4m 5p 6p 7p 8s 8s 8s chun chun chun 9m 9m",
    winTile: "9m",
    seatWind: "ton",
  });
  expect(summaryOf(dealer)?.total).toBeGreaterThan(summaryOf(child)?.total ?? 0);
});

test("親のツモは3人が同額を支払う", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
    winType: "tsumo",
    seatWind: "ton",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: {
      score: {
        payments: [
          { from: "non_dealer", amount: 700 },
          { from: "non_dealer", amount: 700 },
          { from: "non_dealer", amount: 700 },
        ],
      },
    },
  });
});

test("子のツモは親と子で支払い額が変わる", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
    winType: "tsumo",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: {
      score: {
        payments: [
          { from: "dealer", amount: 700 },
          { from: "non_dealer", amount: 400 },
          { from: "non_dealer", amount: 400 },
        ],
      },
    },
  });
});

test("一気通貫は門前で2翻・副露で1翻になる", () => {
  const closed = outcomeOf({
    hand: "1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 3p 4p 9p 9p",
    winTile: "4p",
  });
  const open = outcomeOf({
    hand: "1m 2m 3m 4m 5m 6m 2p 3p 4p 9p 9p",
    melds: [Meld.chi(tiles("7m 8m 9m"), 3)],
    winTile: "4p",
  });
  expect([summaryOf(closed)?.han, summaryOf(open)?.han]).toStrictEqual([3, 1]);
});
