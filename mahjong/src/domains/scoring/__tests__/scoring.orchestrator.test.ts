import { test, expect } from "vitest";

import { Scoring } from "../index.ts";
import { makeInput, asWin, yakuNames, hanOf } from "./input.ts";

const PINFU_HAND = [
  "2m",
  "3m",
  "4m",
  "6m",
  "7m",
  "8m",
  "1p",
  "2p",
  "3p",
  "7p",
  "8p",
  "9s",
  "9s",
] as const;

test("平和ツモは20符・門前ツモと平和が成立する", () => {
  const result = Scoring.evaluate(
    makeInput({ hand: PINFU_HAND, winTile: "6p", winType: "tsumo" }),
  );

  const win = asWin(result);
  expect(win.fu).toBe(20);
  expect(yakuNames(result)).toEqual(
    expect.arrayContaining(["menzen_tsumo", "pinfu"]),
  );
});

test("平和ロンは30符になり門前ツモは付かない", () => {
  const result = Scoring.evaluate(
    makeInput({ hand: PINFU_HAND, winTile: "6p", winType: "ron" }),
  );

  const win = asWin(result);
  expect(win.fu).toBe(30);
  expect(yakuNames(result)).toContain("pinfu");
  expect(yakuNames(result)).not.toContain("menzen_tsumo");
});

test("リーチ宣言は役として計上される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: PINFU_HAND,
      winTile: "6p",
      winType: "ron",
      riichi: "riichi",
    }),
  );

  expect(yakuNames(result)).toEqual(expect.arrayContaining(["riichi", "pinfu"]));
});

test("ダブルリーチは double_riichi として計上されリーチとは併記されない", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: PINFU_HAND,
      winTile: "6p",
      winType: "ron",
      riichi: "double",
    }),
  );

  expect(yakuNames(result)).toContain("double_riichi");
  expect(yakuNames(result)).not.toContain("riichi");
});

test("一発はリーチと共に計上される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: PINFU_HAND,
      winTile: "6p",
      winType: "ron",
      riichi: "riichi",
      ippatsu: true,
    }),
  );

  expect(yakuNames(result)).toContain("ippatsu");
});

test("鳴いたタンヤオ(喰いタン)が成立する", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["5m", "6m", "7m", "3p", "4p", "5p", "6s", "7s", "8s", "2s", "2s"],
      melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }],
      winTile: "7m",
      winType: "ron",
    }),
  );

  const win = asWin(result);
  expect(yakuNames(result)).toContain("tanyao");
  expect(win.han).toBeGreaterThanOrEqual(1);
});

test("三元牌(白)の刻子で役牌が成立する", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: [
        "2m",
        "3m",
        "4m",
        "5p",
        "6p",
        "7p",
        "6s",
        "7s",
        "8s",
        "9p",
        "9p",
        "haku",
        "haku",
      ],
      winTile: "haku",
      winType: "ron",
    }),
  );

  expect(yakuNames(result)).toContain("haku");
});

test("場風と自風が重なると round_wind と seat_wind が別々に計上される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: [
        "1m",
        "2m",
        "3m",
        "4p",
        "5p",
        "6p",
        "7s",
        "8s",
        "9s",
        "ton",
        "ton",
        "ton",
        "5m",
      ],
      winTile: "5m",
      winType: "ron",
      seatWind: "ton",
      roundWind: "ton",
    }),
  );

  const win = asWin(result);
  expect(yakuNames(result)).toEqual(
    expect.arrayContaining(["round_wind", "seat_wind"]),
  );
  expect(win.han).toBe(2);
});

test("七対子は25符2翻になる", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "1m", "4m", "4m", "2p", "2p", "8p", "8p", "3s", "3s", "6s", "6s", "9s"],
      winTile: "9s",
      winType: "ron",
    }),
  );

  const win = asWin(result);
  expect(win.fu).toBe(25);
  expect(win.han).toBe(2);
  expect(yakuNames(result)).toContain("chiitoitsu");
});

test("国士無双は役満(13翻)になる", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"],
      winTile: "chun",
      winType: "ron",
    }),
  );

  const win = asWin(result);
  expect(yakuNames(result)).toContain("kokushi");
  expect(win.han).toBe(13);
  expect(win.score.total).toBe(32000);
});

test("ドラは翻数に加算される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: PINFU_HAND,
      winTile: "6p",
      winType: "ron",
      dora: ["9s"],
    }),
  );

  expect(yakuNames(result)).toContain("dora");
  expect(hanOf(result, "dora")).toBe(2);
});

test("裏ドラはリーチ時に計上される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: PINFU_HAND,
      winTile: "6p",
      winType: "ron",
      riichi: "riichi",
      uraDora: ["2m"],
    }),
  );

  expect(yakuNames(result)).toContain("ura_dora");
  expect(hanOf(result, "ura_dora")).toBe(1);
});

test("リーチでない場合、裏ドラは無視される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: PINFU_HAND,
      winTile: "6p",
      winType: "ron",
      riichi: "none",
      uraDora: ["2m"],
    }),
  );

  expect(yakuNames(result)).not.toContain("ura_dora");
});

test("赤5(0m)は赤ドラとして翻数に加算される", () => {
  const result = Scoring.evaluate(
    makeInput({
      hand: ["3m", "4m", "0m", "6m", "7m", "8m", "1p", "2p", "3p", "7p", "8p", "9s", "9s"],
      winTile: "6p",
      winType: "ron",
    }),
  );

  expect(yakuNames(result)).toContain("aka_dora");
  expect(hanOf(result, "aka_dora")).toBe(1);
});

test("親のロンは同じ手の子のロンより高い", () => {
  const yakuhaiHand = [
    "2m",
    "3m",
    "4m",
    "5p",
    "6p",
    "7p",
    "6s",
    "7s",
    "8s",
    "9p",
    "9p",
    "haku",
    "haku",
  ] as const;
  const dealer = asWin(
    Scoring.evaluate(
      makeInput({ hand: yakuhaiHand, winTile: "haku", winType: "ron", seatWind: "ton" }),
    ),
  );
  const child = asWin(
    Scoring.evaluate(
      makeInput({ hand: yakuhaiHand, winTile: "haku", winType: "ron", seatWind: "nan" }),
    ),
  );

  expect(dealer.score.total).toBeGreaterThan(child.score.total);
});
