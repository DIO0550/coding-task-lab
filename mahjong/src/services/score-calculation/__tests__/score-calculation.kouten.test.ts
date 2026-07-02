import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput } from "./input-factory.ts";

test("三暗刻の解釈と平和形の解釈がある手は高い方(三暗刻)が選ばれる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m",
          "4m", "5m", "6m", "9m",
        ],
        winTile: "9m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  // 111/222/333の暗刻解釈: chinitsu + sanankou = 8翻倍満16000
  // 123×3の順子解釈: chinitsu + iipeiko = 7翻跳満12000
  expect(result.han).toBe(8);
  expect(result.fu).toBe(50);
  expect(result.score.total).toBe(16000);
  expect(result.yaku).toContainEqual({ name: "sanankou", han: 2 });
});

test("二盃口形は七対子ではなく高い方の二盃口として解釈される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "2m", "3m", "3m", "4m", "4m", "6m", "6m", "7m", "7m",
          "8m", "8m", "5m",
        ],
        winTile: "5m",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  // 二盃口解釈: tsumo+pinfu+tanyao+ryanpeikou+chinitsu = 12翻 三倍満24000
  // 七対子解釈: tsumo+tanyao+chiitoitsu+chinitsu = 10翻 倍満16000
  expect(result.han).toBe(12);
  expect(result.yaku).toContainEqual({ name: "ryanpeikou", han: 3 });
  expect(result.yaku).not.toContainEqual({ name: "chiitoitsu", han: 2 });
  expect(result.score.total).toBe(24000);
});

test("待ちの取り方が複数ある手は点数が高くなる待ちで計算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "2m", "3m", "4m", "5m", "5p", "6p", "7p",
          "ton", "ton", "ton", "9s", "9s",
        ],
        winTile: "3m",
        winType: "tsumo",
        seatWind: "ton",
        roundWind: "ton",
      }),
    ),
  );
  // 3mは 123m の辺張(2符)とも 345m の両面(0符)とも取れる。
  // どちらも tsumo+seat+round=3翻だが、辺張解釈は 20+2+8+2=32→40符 で高い
  expect(result.han).toBe(3);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(7800);
});
