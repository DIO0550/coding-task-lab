import { test, expect } from "vitest";

import { ankan, chi, detectYaku, kan, pon, yakuNames } from "./setup";

test("七対子は2翻の役として付く", () => {
  expect(
    detectYaku({ hand: ["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "pei", "pei", "chun", "chun"], winTile: "chun" }),
  ).toStrictEqual([{ name: "chiitoitsu", han: 2 }]);
});

test("刻子4つの手には対々和が付く", () => {
  expect(
    detectYaku({ hand: ["2m", "2m", "2m", "9p", "9p"], melds: [pon("4p"), pon("6s"), pon("8s")], winTile: "9p" }),
  ).toStrictEqual([{ name: "toitoi", han: 2 }]);
});

test("暗刻3つの手には三暗刻が付く", () => {
  expect(
    detectYaku({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "7s", "8s", "9s", "pei", "pei"], winTile: "9s" }),
  ).toStrictEqual([{ name: "sanankou", han: 2 }]);
});

test("双碰待ちでロンして完成した刻子は暗刻に数えない", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "7s", "8s", "9s", "pei", "pei"], winTile: "6s" }),
  ).not.toContain("sanankou");
});

test("双碰待ちでツモして完成した刻子は暗刻に数える", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "6s", "6s", "6s", "7s", "8s", "9s", "pei", "pei"], winTile: "6s", winType: "tsumo" }),
  ).toContain("sanankou");
});

test("暗槓は三暗刻の暗刻として数える", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "2m", "4p", "4p", "4p", "7s", "8s", "9s", "pei", "pei"], melds: [ankan("6s")], winTile: "9s" }),
  ).toContain("sanankou");
});

test("三色同刻は萬子・筒子・索子で同じ数の刻子が揃うと付く", () => {
  expect(
    detectYaku({ hand: ["3m", "3m", "3m", "3p", "3p", "3p", "7s", "8s", "9s", "pei", "pei"], melds: [pon("3s")], winTile: "9s" }),
  ).toStrictEqual([{ name: "sanshoku_doukou", han: 2 }]);
});

test("槓子3つの手には三槓子が付く", () => {
  expect(
    yakuNames({ hand: ["7s", "8s", "9s", "pei", "pei"], melds: [kan("2m"), kan("4p"), ankan("6s")], winTile: "9s" }),
  ).toContain("sankantsu");
});

test("么九牌だけの刻子手には混老頭と対々和が付く", () => {
  expect(
    yakuNames({ hand: ["1m", "1m", "1m", "9p", "9p", "9p", "pei", "pei"], melds: [pon("1s"), pon("haku")], winTile: "pei" }),
  ).toStrictEqual(["haku", "toitoi", "honroutou"]);
});

test("么九牌だけの七対子には混老頭と七対子が付く", () => {
  expect(
    yakuNames({ hand: ["1m", "1m", "9m", "9m", "1p", "1p", "9s", "9s", "ton", "ton", "pei", "pei", "haku", "haku"], winTile: "haku", seatWind: "sha", roundWind: "nan" }),
  ).toStrictEqual(["chiitoitsu", "honroutou"]);
});

test("三元牌の刻子2つと雀頭で小三元が付き、役牌2つも付く", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun"], melds: [chi("6s", "7s", "8s")], winTile: "chun" }),
  ).toStrictEqual([
    { name: "haku", han: 1 },
    { name: "hatsu", han: 1 },
    { name: "shousangen", han: 2 },
  ]);
});

test("三色同順は門前で2翻、副露で1翻", () => {
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "7s", "8s", "9s", "pei", "pei"], winTile: "pei" }),
  ).toStrictEqual([{ name: "sanshoku", han: 2 }]);
  expect(
    detectYaku({ hand: ["2m", "3m", "4m", "2p", "3p", "4p", "7s", "8s", "9s", "pei", "pei"], melds: [chi("2s", "3s", "4s")], winTile: "pei" }),
  ).toStrictEqual([{ name: "sanshoku", han: 1 }]);
});

test("一気通貫は門前で2翻、副露で1翻", () => {
  expect(
    detectYaku({ hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2p", "2p", "2p", "pei", "pei"], winTile: "pei" }),
  ).toStrictEqual([{ name: "ittsu", han: 2 }]);
  expect(
    detectYaku({ hand: ["4m", "5m", "6m", "7m", "8m", "9m", "2p", "2p", "2p", "pei", "pei"], melds: [chi("1m", "2m", "3m")], winTile: "pei" }),
  ).toStrictEqual([{ name: "ittsu", han: 1 }]);
});

test("順子が跨いでいる 123456789 は一気通貫にならない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1m", "2p", "2p", "2p", "pei", "pei"], winTile: "pei", riichi: "riichi" }),
  ).toStrictEqual(["riichi", "ittsu"]);
});

test("チャンタは門前で2翻、副露で1翻", () => {
  expect(
    detectYaku({ hand: ["1m", "2m", "3m", "7p", "8p", "9p", "1s", "1s", "1s", "pei", "pei", "pei", "haku", "haku"], winTile: "haku" }),
  ).toStrictEqual([{ name: "chanta", han: 2 }]);
  expect(
    detectYaku({ hand: ["7p", "8p", "9p", "1s", "1s", "1s", "pei", "pei", "pei", "haku", "haku"], melds: [chi("1m", "2m", "3m")], winTile: "haku" }),
  ).toStrictEqual([{ name: "chanta", han: 1 }]);
});

test("混一色は門前で3翻、副露で2翻", () => {
  expect(
    detectYaku({ hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "7m", "7m", "pei", "pei", "pei", "9m", "9m"], winTile: "9m" }),
  ).toStrictEqual([{ name: "honitsu", han: 3 }]);
  expect(
    detectYaku({ hand: ["4m", "5m", "6m", "7m", "7m", "7m", "pei", "pei", "pei", "9m", "9m"], melds: [chi("1m", "2m", "3m")], winTile: "9m" }),
  ).toStrictEqual([{ name: "honitsu", han: 2 }]);
});

test("純チャンは門前で3翻、副露で2翻", () => {
  expect(
    detectYaku({ hand: ["1m", "2m", "3m", "7p", "8p", "9p", "1s", "1s", "1s", "7s", "8s", "9s", "9m", "9m"], winTile: "9m" }),
  ).toStrictEqual([{ name: "junchan", han: 3 }]);
  expect(
    detectYaku({ hand: ["7p", "8p", "9p", "1s", "1s", "1s", "7s", "8s", "9s", "9m", "9m"], melds: [chi("1m", "2m", "3m")], winTile: "9m" }),
  ).toStrictEqual([{ name: "junchan", han: 2 }]);
});

test("同じ順子2組が2種類ある門前の手には二盃口が3翻付き、一盃口は付かない", () => {
  expect(
    detectYaku({ hand: ["2m", "2m", "3m", "3m", "4m", "4m", "6p", "6p", "7p", "7p", "8p", "8p", "pei", "pei"], winTile: "pei" }),
  ).toStrictEqual([{ name: "ryanpeikou", han: 3 }]);
});

test("同じ順子が4つある手も二盃口になる", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "2m", "2m", "3m", "3m", "3m", "3m", "4m", "4m", "4m", "4m", "pei", "pei"], winTile: "pei" }),
  ).toContain("ryanpeikou");
});

test("清一色は門前で6翻、副露で5翻", () => {
  expect(
    detectYaku({ hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "7m", "7m", "8m", "8m", "8m", "9m", "9m"], winTile: "9m" }),
  ).toStrictEqual([{ name: "chinitsu", han: 6 }]);
  expect(
    detectYaku({ hand: ["4m", "5m", "6m", "7m", "7m", "7m", "8m", "8m", "8m", "9m", "9m"], melds: [chi("1m", "2m", "3m")], winTile: "9m" }),
  ).toStrictEqual([{ name: "chinitsu", han: 5 }]);
});
