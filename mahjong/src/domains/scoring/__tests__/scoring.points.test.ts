import { test, expect } from "vitest";

import { Scoring } from "../index.ts";
import { makeInput, asWin, yakuNames } from "./input.ts";

/** 子・門前・立直・平和・断幺の3翻手。ドラで翻数を積んで各満貫帯を作る */
const BASE_HAND = [
  "2m",
  "3m",
  "4m",
  "6m",
  "7m",
  "8m",
  "2p",
  "3p",
  "4p",
  "7p",
  "8p",
  "5s",
  "5s",
] as const;

const evaluateWithDora = (dora: readonly string[]) =>
  Scoring.evaluate(
    makeInput({
      hand: BASE_HAND,
      winTile: "6p",
      winType: "ron",
      riichi: "riichi",
      dora,
    }),
  );

test("5翻は満貫(子ロン8000)になる", () => {
  const win = asWin(evaluateWithDora(["2m", "6m"]));
  expect(win.han).toBe(5);
  expect(win.score.total).toBe(8000);
});

test("7翻は跳満(子ロン12000)になる", () => {
  const win = asWin(evaluateWithDora(["2m", "6m", "2p", "7p"]));
  expect(win.han).toBe(7);
  expect(win.score.total).toBe(12000);
});

test("8翻は倍満(子ロン16000)になる", () => {
  const win = asWin(evaluateWithDora(["2m", "6m", "2p", "7p", "3m"]));
  expect(win.han).toBe(8);
  expect(win.score.total).toBe(16000);
});

test("11翻は三倍満(子ロン24000)になる", () => {
  const win = asWin(evaluateWithDora(["5s", "5s", "5s", "5s"]));
  expect(win.han).toBe(11);
  expect(win.score.total).toBe(24000);
});

test("13翻は数え役満(子ロン32000)になり実役満は付かない", () => {
  const win = asWin(evaluateWithDora(["5s", "5s", "5s", "5s", "5s"]));
  expect(win.han).toBe(13);
  expect(win.score.total).toBe(32000);
  expect(yakuNames(win)).not.toContain("kokushi");
  expect(yakuNames(win)).not.toContain("suuankou");
});

test("役満(国士無双)は子ロン32000になる", () => {
  const win = asWin(
    Scoring.evaluate(
      makeInput({
        hand: ["1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"],
        winTile: "chun",
        winType: "ron",
      }),
    ),
  );
  expect(win.score.total).toBe(32000);
});

test("四暗刻単騎はダブル役満(子ロン64000)になる", () => {
  const win = asWin(
    Scoring.evaluate(
      makeInput({
        hand: ["2m", "2m", "2m", "5p", "5p", "5p", "8s", "8s", "8s", "ton", "ton", "ton", "9m"],
        winTile: "9m",
        winType: "ron",
      }),
    ),
  );
  expect(yakuNames(win)).toContain("suuankou_tanki");
  expect(win.han).toBe(26);
  expect(win.score.total).toBe(64000);
});
