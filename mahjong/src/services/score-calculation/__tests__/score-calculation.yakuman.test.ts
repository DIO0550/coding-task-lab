import { expect, test } from "vitest";

import { Meld } from "../../../domains/meld/index.ts";
import { outcomeOf, summaryOf, tiles, yakuNames } from "./score-fixture.ts";

test("国士無双は役満として成立する", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
    winTile: "chun",
  });
  expect(yakuNames(outcome)).toStrictEqual(["kokushi_musou"]);
});

test("国士無双は子のロンで32000点になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
    winTile: "chun",
  });
  expect(summaryOf(outcome)?.total).toBe(32000);
});

test("国士無双は親のロンで48000点になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
    winTile: "chun",
    seatWind: "ton",
  });
  expect(summaryOf(outcome)?.total).toBe(48000);
});

test("国士無双十三面待ちはダブル役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun chun",
    winTile: "chun",
  });
  expect(yakuNames(outcome)).toStrictEqual(["kokushi_musou_juusanmen"]);
});

test("国士無双十三面待ちは子のロンで64000点になる", () => {
  const outcome = outcomeOf({
    hand: "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun chun",
    winTile: "chun",
  });
  expect(summaryOf(outcome)?.total).toBe(64000);
});

test("四暗刻の双碰待ちツモは役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 1m 2p 2p 2p 3s 3s 3s ton ton ton 9m 9m",
    winTile: "1m",
    winType: "tsumo",
  });
  expect(yakuNames(outcome)).toStrictEqual(["suuankou"]);
});

test("四暗刻単騎待ちはダブル役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 1m 2p 2p 2p 3s 3s 3s ton ton ton 9m 9m",
    winTile: "9m",
    winType: "tsumo",
  });
  expect(yakuNames(outcome)).toStrictEqual(["suuankou_tanki"]);
});

test("三元牌の刻子3つは大三元になる", () => {
  const outcome = outcomeOf({
    hand: "haku haku haku hatsu hatsu hatsu chun chun chun 2m 3m 4m 5p 5p",
    winTile: "5p",
  });
  expect(yakuNames(outcome)).toStrictEqual(["daisangen"]);
});

test("字牌のみの手は字一色になる", () => {
  const outcome = outcomeOf({
    hand: "ton ton ton nan nan nan sha sha sha haku haku chun chun chun",
    winTile: "chun",
  });
  expect(yakuNames(outcome)).toStrictEqual(["tsuuiisou"]);
});

test("發を含まない緑一色も役満として成立する", () => {
  const outcome = outcomeOf({
    hand: "2s 3s 4s 2s 3s 4s 6s 6s 6s 8s 8s",
    melds: [Meld.pon(tiles("3s 3s 3s"), 2)],
    winTile: "8s",
  });
  expect(yakuNames(outcome)).toStrictEqual(["ryuuiisou"]);
});

test("風牌の刻子3つと風牌の雀頭は小四喜になる", () => {
  const outcome = outcomeOf({
    hand: "ton ton ton nan nan nan sha sha sha pei pei 2m 3m 4m",
    winTile: "4m",
  });
  expect(yakuNames(outcome)).toStrictEqual(["shousuushii"]);
});

test("風牌の刻子4つはダブル役満の大四喜になる", () => {
  const outcome = outcomeOf({
    hand: "nan nan nan sha sha sha pei pei pei 5m 5m",
    melds: [Meld.pon(tiles("ton ton ton"), 2)],
    winTile: "5m",
  });
  expect(yakuNames(outcome)).toStrictEqual(["daisuushii"]);
});

test("清一色の九蓮宝燈形は役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 1m 2m 3m 4m 5m 5m 6m 7m 8m 9m 9m 9m",
    winTile: "3m",
  });
  expect(yakuNames(outcome)).toStrictEqual(["chuuren_poutou"]);
});

test("純正九蓮宝燈はダブル役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 1m 1m 2m 3m 4m 5m 5m 6m 7m 8m 9m 9m 9m",
    winTile: "5m",
  });
  expect(yakuNames(outcome)).toStrictEqual(["junsei_chuuren_poutou"]);
});

test("老頭牌のみの手は清老頭になる", () => {
  const outcome = outcomeOf({
    hand: "9m 9m 9m 1p 1p 1p 9s 9s 9s 1s 1s",
    melds: [Meld.pon(tiles("1m 1m 1m"), 2)],
    winTile: "1s",
  });
  expect(yakuNames(outcome)).toStrictEqual(["chinroutou"]);
});

test("暗槓4つの手は四槓子と四暗刻単騎が複合する", () => {
  const outcome = outcomeOf({
    hand: "9m 9m",
    melds: [
      Meld.ankan(tiles("1m 1m 1m 1m")),
      Meld.ankan(tiles("2p 2p 2p 2p")),
      Meld.ankan(tiles("3s 3s 3s 3s")),
      Meld.ankan(tiles("ton ton ton ton")),
    ],
    winTile: "9m",
    winType: "tsumo",
  });
  expect(yakuNames(outcome).toSorted()).toStrictEqual([
    "suuankou_tanki",
    "suukantsu",
  ]);
});

test("役満の複合はダブル役満が上限になる", () => {
  const outcome = outcomeOf({
    hand: "9m 9m",
    melds: [
      Meld.ankan(tiles("1m 1m 1m 1m")),
      Meld.ankan(tiles("2p 2p 2p 2p")),
      Meld.ankan(tiles("3s 3s 3s 3s")),
      Meld.ankan(tiles("ton ton ton ton")),
    ],
    winTile: "9m",
    winType: "tsumo",
  });
  expect(summaryOf(outcome)?.han).toBe(26);
});

test("天和は親のツモ和了で役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s 2m 3m 4m 5m 5m",
    winTile: "5m",
    winType: "tsumo",
    seatWind: "ton",
    situational: ["tenhou"],
  });
  expect(yakuNames(outcome)).toStrictEqual(["tenhou"]);
});

test("地和は子のツモ和了で役満になる", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s 2m 3m 4m 5m 5m",
    winTile: "5m",
    winType: "tsumo",
    situational: ["chihou"],
  });
  expect(yakuNames(outcome)).toStrictEqual(["chihou"]);
});

test("ロン和了に天和を指定しても役として成立しない", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s 2m 3m 4m 5m 5m",
    winTile: "5m",
    seatWind: "ton",
    situational: ["tenhou"],
  });
  expect(outcome).toStrictEqual({ type: "no_yaku" });
});

test("子のツモ和了に天和を指定しても役として成立しない", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s 2m 3m 4m 5m 5m",
    winTile: "5m",
    winType: "tsumo",
    situational: ["tenhou"],
  });
  expect(yakuNames(outcome)).toStrictEqual(["menzen_tsumo"]);
});

test("親のツモ和了に地和を指定しても役として成立しない", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 4p 5p 6p 7s 8s 9s 2m 3m 4m 5m 5m",
    winTile: "5m",
    winType: "tsumo",
    seatWind: "ton",
    situational: ["chihou"],
  });
  expect(yakuNames(outcome)).toStrictEqual(["menzen_tsumo"]);
});

test("役満成立時はドラを翻数に加算しない", () => {
  const outcome = outcomeOf({
    hand: "haku haku haku hatsu hatsu hatsu chun chun chun 2m 3m 4m 5p 5p",
    winTile: "5p",
    dora: "5p 2m",
  });
  expect(summaryOf(outcome)?.han).toBe(13);
});
