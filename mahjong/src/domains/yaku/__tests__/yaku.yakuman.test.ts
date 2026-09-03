import { test, expect } from "vitest";

import { ankan, detectYaku, kan, pon, yakuNames } from "./setup";

test("国士無双は役満(13翻)として付く", () => {
  expect(
    detectYaku({ hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"], winTile: "1m" }),
  ).toStrictEqual([{ name: "kokushi_musou", han: 13 }]);
});

test("国士無双十三面待ちはダブル役満(26翻)として付く", () => {
  expect(
    detectYaku({ hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"], winTile: "chun" }),
  ).toStrictEqual([{ name: "kokushi_musou_13", han: 26 }]);
});

test("暗刻4つをツモ和了すると四暗刻(役満)になる", () => {
  expect(
    detectYaku({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "8s", "8s", "8s", "pei", "pei"], winTile: "8s", winType: "tsumo" }),
  ).toStrictEqual([{ name: "suuankou", han: 13 }]);
});

test("四暗刻単騎待ちはダブル役満(26翻)になる", () => {
  expect(
    detectYaku({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "8s", "8s", "8s", "pei", "pei"], winTile: "pei" }),
  ).toStrictEqual([{ name: "suuankou_tanki", han: 26 }]);
});

test("双碰待ちでロンした4刻子の手は四暗刻にならず対々和・三暗刻になる", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "8s", "8s", "8s", "pei", "pei"], winTile: "8s", winType: "ron" }),
  ).toStrictEqual(["toitoi", "sanankou"]);
});

test("三元牌の刻子3つで大三元(役満)になる", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "pei", "pei"], melds: [pon("chun")], winTile: "pei" }),
  ).toStrictEqual([{ name: "daisangen", han: 13 }]);
});

test("風牌の刻子3つと風牌の雀頭で小四喜(役満)になる", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei"], winTile: "pei" }),
  ).toStrictEqual([{ name: "shousuushii", han: 13 }]);
});

test("風牌の刻子4つで大四喜(ダブル役満)になる", () => {
  expect(
    detectYaku({ hand: ["nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "pei", "2m", "2m"], melds: [pon("ton")], winTile: "2m" }),
  ).toStrictEqual([{ name: "daisuushii", han: 26 }]);
});

test("字牌だけの手は字一色(役満)になる", () => {
  expect(
    detectYaku({ hand: ["nan", "nan", "nan", "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "pei", "pei"], melds: [pon("ton")], winTile: "pei" }),
  ).toStrictEqual([{ name: "tsuuiisou", han: 13 }]);
});

test("字牌だけの七対子も字一色(役満)になる", () => {
  expect(
    detectYaku({ hand: ["ton", "ton", "nan", "nan", "sha", "sha", "pei", "pei", "haku", "haku", "hatsu", "hatsu", "chun", "chun"], winTile: "chun" }),
  ).toStrictEqual([{ name: "tsuuiisou", han: 13 }]);
});

test("一九牌だけの手は清老頭(役満)になる", () => {
  expect(
    detectYaku({ hand: ["9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "9p", "1s", "1s"], melds: [pon("1m")], winTile: "1s" }),
  ).toStrictEqual([{ name: "chinroutou", han: 13 }]);
});

test("緑の牌だけの手は緑一色(役満)になる", () => {
  expect(
    detectYaku({ hand: ["2s", "3s", "4s", "2s", "3s", "4s", "6s", "6s", "6s", "hatsu", "hatsu", "hatsu", "8s", "8s"], winTile: "8s" }),
  ).toStrictEqual([{ name: "ryuuiisou", han: 13 }]);
});

test("發がなくても緑の牌だけなら緑一色(役満)になる", () => {
  expect(
    detectYaku({ hand: ["2s", "3s", "4s", "2s", "3s", "4s", "6s", "6s", "6s", "8s", "8s", "8s", "2s", "2s"], winTile: "2s", winType: "tsumo" }),
  ).toStrictEqual([{ name: "ryuuiisou", han: 13 }]);
});

test("1112345678999 + 1枚の門前清一色は九蓮宝燈(役満)になる", () => {
  expect(
    detectYaku({ hand: ["1m", "1m", "1m", "2m", "3m", "4m", "5m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"], winTile: "1m" }),
  ).toStrictEqual([{ name: "chuuren_poutou", han: 13 }]);
});

test("純正九蓮宝燈(九面待ち)はダブル役満(26翻)になる", () => {
  expect(
    detectYaku({ hand: ["1m", "1m", "1m", "2m", "3m", "4m", "5m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"], winTile: "5m" }),
  ).toStrictEqual([{ name: "junsei_chuuren_poutou", han: 26 }]);
});

test("副露した九蓮形は九蓮宝燈にならず清一色になる", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "5m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"], melds: [pon("1m")], winTile: "5m" }),
  ).toStrictEqual(["chinitsu"]);
});

test("槓子4つの手は四槓子(役満)になる", () => {
  expect(
    detectYaku({ hand: ["pei", "pei"], melds: [kan("1m"), kan("2p"), ankan("3s"), kan("4m")], winTile: "pei" }),
  ).toStrictEqual([{ name: "suukantsu", han: 13 }]);
});

test("親が配牌でツモ和了すると天和(役満)になる", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"] as const;
  expect(detectYaku({ hand, winTile: "4s", winType: "tsumo", seatWind: "ton", situational: ["tenhou"] })).toStrictEqual([{ name: "tenhou", han: 13 }]);
  expect(yakuNames({ hand, winTile: "4s", winType: "tsumo", seatWind: "nan", situational: ["tenhou"] })).not.toContain("tenhou");
});

test("子が第一ツモで和了すると地和(役満)になる", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"] as const;
  expect(detectYaku({ hand, winTile: "4s", winType: "tsumo", seatWind: "nan", situational: ["chihou"] })).toStrictEqual([{ name: "chihou", han: 13 }]);
  expect(yakuNames({ hand, winTile: "4s", winType: "tsumo", seatWind: "ton", situational: ["chihou"] })).not.toContain("chihou");
});

test("役満が成立した手には通常役やドラを含めない", () => {
  expect(
    detectYaku({
      hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "8s", "8s", "8s", "pei", "pei"],
      winTile: "8s",
      winType: "tsumo",
      riichi: "riichi",
      dora: ["2m"],
      uraDora: ["4p"],
    }),
  ).toStrictEqual([{ name: "suuankou", han: 13 }]);
});

test("大三元と字一色は複合してダブル役満(合計26翻)になる", () => {
  expect(
    detectYaku({ hand: ["haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "nan", "nan"], melds: [pon("ton")], winTile: "nan" }),
  ).toStrictEqual([
    { name: "daisangen", han: 13 },
    { name: "tsuuiisou", han: 13 },
  ]);
});

test("役満の複合はダブル役満(26翻)を上限とし、超える分は一覧から除かれる", () => {
  // 大四喜(26) + 字一色(13) → 26翻を上限に大四喜のみ
  expect(
    detectYaku({ hand: ["nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "pei", "haku", "haku"], melds: [pon("ton")], winTile: "haku" }),
  ).toStrictEqual([{ name: "daisuushii", han: 26 }]);
});

test("門前で4刻子を単騎待ちで和了すると四暗刻単騎(26翻)が優先され、他の役満は上限で除かれる", () => {
  expect(
    detectYaku({ hand: ["ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "pei", "haku", "haku"], winTile: "haku" }),
  ).toStrictEqual([{ name: "suuankou_tanki", han: 26 }]);
});
