import { test, expect } from "vitest";

import { Scoring } from "../index.ts";
import { makeInput, asWin, yakuNames } from "./input.ts";

test("二盃口と七対子の両解釈がある手は高点の二盃口を採用する", () => {
  // 112233m 445566p 77s: 七対子(2翻25符)とも二盃口(3翻)とも解釈できる
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "1m", "2m", "2m", "3m", "3m", "4p", "4p", "5p", "5p", "6p", "6p", "7s"],
      winTile: "7s",
      winType: "ron",
    }),
  );

  const win = asWin(result);
  expect(yakuNames(result)).toContain("ryanpeiko");
  expect(yakuNames(result)).not.toContain("chiitoitsu");
  expect(win.han).toBe(3);
});

test("刻子と順子の両解釈がある手は高点の三暗刻を採用する", () => {
  // 111222333m 456m 99p ツモ: 三暗刻(2翻)とも一盃口(1翻)とも解釈できる
  const result = Scoring.evaluate(
    makeInput({
      hand: ["1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m", "4m", "5m", "6m", "9p"],
      winTile: "9p",
      winType: "tsumo",
    }),
  );

  const win = asWin(result);
  expect(yakuNames(result)).toEqual(
    expect.arrayContaining(["sanankou", "menzen_tsumo"]),
  );
  expect(yakuNames(result)).not.toContain("iipeiko");
  expect(win.han).toBe(3);
});
