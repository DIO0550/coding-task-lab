import { test, expect } from "vitest";

import { chi, hanOf, pon, yakuNames } from "./setup";

test("リーチした手にはリーチが1翻付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"], winTile: "9p", riichi: "riichi" }),
  ).toContain("riichi");
});

test("ダブルリーチはリーチの代わりに2翻として付く", () => {
  const names = yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"], winTile: "9p", riichi: "double" });
  expect(names).toContain("double_riichi");
  expect(names).not.toContain("riichi");
  expect(hanOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"], winTile: "9p", riichi: "double" }, "double_riichi")).toBe(2);
});

test("リーチ後の一発は1翻付き、リーチなしでは一発は付かない", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"] as const;
  expect(yakuNames({ hand, winTile: "9p", riichi: "riichi", ippatsu: true })).toStrictEqual(["riichi", "ippatsu"]);
  expect(yakuNames({ hand, winTile: "9p", riichi: "none", ippatsu: true })).toStrictEqual([]);
});

test("門前でツモ和了すると門前清自摸和が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "1s", "2s", "3s", "9p", "9p"], winTile: "9p", winType: "tsumo" }),
  ).toContain("menzen_tsumo");
});

test("副露している手のツモ和了には門前清自摸和が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [pon("haku")], winTile: "9p", winType: "tsumo" }),
  ).not.toContain("menzen_tsumo");
});

test("門前・順子4つ・両面待ち・役牌でない雀頭なら平和が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s" }),
  ).toStrictEqual(["pinfu"]);
});

test("嵌張待ちの和了には平和が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "3s", riichi: "riichi" }),
  ).not.toContain("pinfu");
});

test("役牌の雀頭がある手には平和が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "haku", "haku"], winTile: "4s", riichi: "riichi" }),
  ).not.toContain("pinfu");
});

test("自風の雀頭がある手には平和が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "nan", "nan"], winTile: "4s", seatWind: "nan", riichi: "riichi" }),
  ).not.toContain("pinfu");
});

test("副露した手には平和が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "2s", "3s", "4s", "9p", "9p"], melds: [chi("6s", "7s", "8s")], winTile: "4s", riichi: "none", dora: ["9p"] }),
  ).not.toContain("pinfu");
});

test("么九牌を含まない門前の手には断么九が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"], winTile: "8p" }),
  ).toStrictEqual(["tanyao"]);
});

test("喰いタンありなら副露した断么九も成立する", () => {
  expect(
    yakuNames({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "5s", "5s", "5s", "8p", "8p"], melds: [chi("6s", "7s", "8s")], winTile: "8p" }),
  ).toStrictEqual(["tanyao"]);
});

test("同じ順子が2組ある門前の手には一盃口が付く", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "3m", "3m", "4m", "4m", "4p", "5p", "6p", "sha", "sha", "sha", "9p", "9p"], winTile: "9p" }),
  ).toStrictEqual(["iipeikou"]);
});

test("副露した手には一盃口が付かない", () => {
  expect(
    yakuNames({ hand: ["2m", "2m", "3m", "3m", "4m", "4m", "4p", "5p", "6p", "9p", "9p"], melds: [pon("haku")], winTile: "9p" }),
  ).toStrictEqual(["haku"]);
});

test("海底牌でツモ和了すると海底摸月が付く", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(yakuNames({ hand, winTile: "8p", winType: "tsumo", situational: ["haitei"] })).toContain("haitei");
  expect(yakuNames({ hand, winTile: "8p", winType: "ron", situational: ["haitei"] })).not.toContain("haitei");
});

test("河底牌でロン和了すると河底撈魚が付く", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(yakuNames({ hand, winTile: "8p", winType: "ron", situational: ["houtei"] })).toContain("houtei");
  expect(yakuNames({ hand, winTile: "8p", winType: "tsumo", situational: ["houtei"] })).not.toContain("houtei");
});

test("嶺上牌でツモ和了すると嶺上開花が付く", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(yakuNames({ hand, winTile: "8p", winType: "tsumo", situational: ["rinshan"] })).toContain("rinshan");
  expect(yakuNames({ hand, winTile: "8p", winType: "ron", situational: ["rinshan"] })).not.toContain("rinshan");
});

test("加槓の牌でロン和了すると槍槓が付く", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(yakuNames({ hand, winTile: "8p", winType: "ron", situational: ["chankan"] })).toContain("chankan");
  expect(yakuNames({ hand, winTile: "8p", winType: "tsumo", situational: ["chankan"] })).not.toContain("chankan");
});

test("役は一覧順(リーチ → 門前ツモ → 平和 → 断么九 → 一盃口)で返る", () => {
  expect(
    yakuNames({
      hand: ["2m", "2m", "3m", "3m", "4m", "4m", "4p", "5p", "6p", "5s", "6s", "7s", "8p", "8p"],
      winTile: "7s",
      winType: "tsumo",
      riichi: "riichi",
    }),
  ).toStrictEqual(["riichi", "menzen_tsumo", "pinfu", "tanyao", "iipeikou"]);
});
