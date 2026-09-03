import { test, expect } from "vitest";

import { ScoreCalculator } from "..";

import { chi, input, pon } from "./setup";

test("通常形(4面子1雀頭)の和了は役・翻・符・点数を返す", () => {
  const result = ScoreCalculator.calculate(
    input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], winTile: "9p" }),
  );
  expect(result).toStrictEqual({
    valid: true,
    yaku: [{ name: "haku", han: 1 }],
    han: 1,
    fu: 40,
    score: { total: 1300, payments: [{ from: "discarder", amount: 1300 }] },
  });
});

test("七対子の和了は2翻25符として計算される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "pei", "pei", "chun", "chun"], winTile: "chun" }),
    ),
  ).toStrictEqual({
    valid: true,
    yaku: [{ name: "chiitoitsu", han: 2 }],
    han: 2,
    fu: 25,
    score: { total: 1600, payments: [{ from: "discarder", amount: 1600 }] },
  });
});

test("国士無双の和了は役満として計算される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"], winTile: "1m" }),
    ),
  ).toMatchObject({ valid: true, yaku: [{ name: "kokushi_musou", han: 13 }], han: 13, score: { total: 32000 } });
});

test("平和ツモは20符2翻として計算される(子: 親700・子400)", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s", winType: "tsumo" }),
    ),
  ).toStrictEqual({
    valid: true,
    yaku: [
      { name: "menzen_tsumo", han: 1 },
      { name: "pinfu", han: 1 },
    ],
    han: 2,
    fu: 20,
    score: {
      total: 1500,
      payments: [
        { from: "dealer", amount: 700 },
        { from: "non_dealer", amount: 400 },
        { from: "non_dealer", amount: 400 },
      ],
    },
  });
});

test("平和ロンは30符1翻1000点になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s" })),
  ).toMatchObject({ valid: true, han: 1, fu: 30, score: { total: 1000 } });
});

test("ポンした役牌の手は1翻30符1000点になる", () => {
  expect(
    ScoreCalculator.calculate(input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [pon("haku")], winTile: "9p" })),
  ).toMatchObject({ valid: true, yaku: [{ name: "haku", han: 1 }], han: 1, fu: 30, score: { total: 1000 } });
});

test("喰いタンありなら副露した断么九で和了できる", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(ScoreCalculator.calculate(input({ hand, melds: [chi("6s", "7s", "8s")], winTile: "8p" }))).toMatchObject({
    valid: true,
    yaku: [{ name: "tanyao", han: 1 }],
  });
});

test("喰いタンなしでは副露した断么九は no_yaku になる", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "5s", "5s", "5s", "8p", "8p"] as const;
  expect(
    ScoreCalculator.calculate(input({ hand, melds: [chi("6s", "7s", "8s")], winTile: "8p" }), { kuitan: false, atozuke: true }),
  ).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("リーチのみの和了は1翻として計算される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"], winTile: "9p", riichi: "riichi" }),
    ),
  ).toMatchObject({ valid: true, yaku: [{ name: "riichi", han: 1 }], han: 1, fu: 40, score: { total: 1300 } });
});

test("ダブルリーチ+一発の和了は3翻として計算される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"], winTile: "9p", riichi: "double", ippatsu: true }),
    ),
  ).toMatchObject({
    valid: true,
    yaku: [
      { name: "double_riichi", han: 2 },
      { name: "ippatsu", han: 1 },
    ],
    han: 3,
    fu: 40,
    score: { total: 5200 },
  });
});

test("同じ手でもツモなら門前清自摸和が加わり、ロンより翻数が増える", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"] as const;
  const ron = ScoreCalculator.calculate(input({ hand, winTile: "9p", riichi: "riichi", winType: "ron" }));
  const tsumo = ScoreCalculator.calculate(input({ hand, winTile: "9p", riichi: "riichi", winType: "tsumo" }));
  expect(ron).toMatchObject({ valid: true, han: 1, fu: 40 });
  expect(tsumo).toMatchObject({ valid: true, han: 2, fu: 40, score: { total: 2700 } });
});

test("同じ手でも親は子の1.5倍の点数になる", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"] as const;
  expect(ScoreCalculator.calculate(input({ hand, winTile: "9p", seatWind: "nan" }))).toMatchObject({ score: { total: 1300 } });
  expect(ScoreCalculator.calculate(input({ hand, winTile: "9p", seatWind: "ton" }))).toMatchObject({ score: { total: 2000 } });
});

test("親のツモは子全員から同額を受け取る", () => {
  const hand = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"] as const;
  expect(ScoreCalculator.calculate(input({ hand, winTile: "9p", seatWind: "ton", winType: "tsumo" }))).toMatchObject({
    han: 2,
    fu: 40,
    score: {
      total: 3900,
      payments: [
        { from: "non_dealer", amount: 1300 },
        { from: "non_dealer", amount: 1300 },
        { from: "non_dealer", amount: 1300 },
      ],
    },
  });
});

test("ドラ・裏ドラ・赤ドラは翻数に加算される", () => {
  expect(
    ScoreCalculator.calculate(
      input({
        hand: ["2m", "3m", "4m", "4p", "0p", "6p", "6s", "7s", "8s", "sha", "sha", "sha", "9p", "9p"],
        winTile: "9p",
        riichi: "riichi",
        dora: ["4m"],
        uraDora: ["9p"],
      }),
    ),
  ).toMatchObject({
    valid: true,
    yaku: [
      { name: "riichi", han: 1 },
      { name: "dora", han: 1 },
      { name: "ura_dora", han: 2 },
      { name: "aka_dora", han: 1 },
    ],
    han: 5,
    score: { total: 8000 },
  });
});

test("裏ドラはリーチしていなければ加算されない", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "haku", "haku", "haku", "9p", "9p"], winTile: "9p", uraDora: ["9p"] }),
    ),
  ).toMatchObject({ han: 1 });
});

test("本場は点数に加算される(親ロン3900 + 2本場600 = 4500)", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], winTile: "5m", seatWind: "ton", honba: 2 }),
    ),
  ).toMatchObject({ score: { total: 4500, payments: [{ from: "discarder", amount: 4500 }] } });
});

test("供託は和了者が受け取り、合計に含まれる", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], winTile: "5m", seatWind: "ton", kyotaku: 2 }),
    ),
  ).toMatchObject({
    score: {
      total: 5900,
      payments: [
        { from: "discarder", amount: 3900 },
        { from: "kyotaku", amount: 2000 },
      ],
    },
  });
});

test("ツモの本場は各家100点ずつ加算される", () => {
  expect(
    ScoreCalculator.calculate(
      input({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s", winType: "tsumo", honba: 1 }),
    ),
  ).toMatchObject({
    score: {
      total: 1800,
      payments: [
        { from: "dealer", amount: 800 },
        { from: "non_dealer", amount: 500 },
        { from: "non_dealer", amount: 500 },
      ],
    },
  });
});
