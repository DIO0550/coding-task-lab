import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput } from "./input-factory.ts";

test("親のツモは3人の子が同額を支払う", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
          "ton", "ton", "ton", "5m",
        ],
        winTile: "5m",
        winType: "tsumo",
        seatWind: "ton",
        roundWind: "ton",
      }),
    ),
  );
  // menzen_tsumo + seat_wind + round_wind = 3翻40符 → 2600オール
  expect(result.han).toBe(3);
  expect(result.fu).toBe(40);
  expect(result.score.payments).toStrictEqual([
    { from: "non_dealer", amount: 2600 },
    { from: "non_dealer", amount: 2600 },
    { from: "non_dealer", amount: 2600 },
  ]);
  expect(result.score.total).toBe(7800);
});

test("子のロンは放銃者が全額を支払う", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s",
          "haku", "haku", "haku", "9s",
        ],
        winTile: "9s",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.score.payments).toStrictEqual([
    { from: "discarder", amount: 1300 },
  ]);
});

test("基本点が2000点を超える手は満貫に丸められる", () => {
  // 対々和+三暗刻の4翻50符(基本点3200)は満貫8000点になる
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "3m", "3m", "3m", "6p", "6p", "6p", "2s", "2s", "2s",
          "nan", "nan", "8s", "8s",
        ],
        winTile: "nan",
        winType: "ron",
        seatWind: "sha",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.han).toBe(4);
  expect(result.fu).toBe(50);
  expect(result.score.total).toBe(8000);
});

test("5翻は満貫として子ツモ2000/4000になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "2s", "3s", "5m", "5m",
        ],
        winTile: "4s",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
        riichi: "riichi",
        ippatsu: true,
        dora: ["2m"],
      }),
    ),
  );
  // riichi + ippatsu + menzen_tsumo + pinfu + dora1 = 5翻
  expect(result.han).toBe(5);
  expect(result.score.payments).toStrictEqual([
    { from: "dealer", amount: 4000 },
    { from: "non_dealer", amount: 2000 },
    { from: "non_dealer", amount: 2000 },
  ]);
  expect(result.score.total).toBe(8000);
});

test("6翻は跳満として子ツモ3000/6000になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "4m", "4m", "6p", "6p", "8p", "8p", "2s", "2s",
          "5s", "5s", "haku",
        ],
        winTile: "haku",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
        riichi: "riichi",
        dora: ["4m"],
      }),
    ),
  );
  // riichi + menzen_tsumo + chiitoitsu + dora2 = 6翻
  expect(result.han).toBe(6);
  expect(result.score.total).toBe(12000);
});

test("8〜10翻は倍満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "2m", "3m", "4m", "4m", "5m", "5m", "6m", "6m",
          "7m", "8m", "9m", "9m",
        ],
        winTile: "9m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  // pinfu + iipeiko + ittsu + chinitsu = 10翻 → 倍満16000
  expect(result.han).toBe(10);
  expect(result.score.total).toBe(16000);
});

test("11〜12翻は三倍満になる", () => {
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
  // menzen_tsumo + pinfu + tanyao + ryanpeikou + chinitsu = 12翻 → 三倍満
  // (雀頭を2mに取ると5mは345mの両面待ちになり平和が付く)
  expect(result.han).toBe(12);
  expect(result.score.total).toBe(24000);
});

test("13翻以上は数え役満として計算される", () => {
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
        riichi: "double",
        ippatsu: true,
      }),
    ),
  );
  // double_riichi + ippatsu + menzen_tsumo + pinfu + tanyao + ryanpeikou
  // + chinitsu = 15翻
  expect(result.han).toBe(15);
  expect(result.score.total).toBe(32000);
  expect(result.score.payments).toStrictEqual([
    { from: "dealer", amount: 16000 },
    { from: "non_dealer", amount: 8000 },
    { from: "non_dealer", amount: 8000 },
  ]);
});

test("ロンの本場は300点加算、供託は合計にのみ加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(calcInput({ honba: 2, kyotaku: 1 })),
  );
  expect(result.score.payments).toStrictEqual([
    { from: "discarder", amount: 4500 },
  ]);
  expect(result.score.total).toBe(5500);
});

test("ツモの本場は各家100点加算、供託は合計にのみ加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "sha", "sha", "sha", "5m",
        ],
        winTile: "5m",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
        honba: 1,
        kyotaku: 2,
      }),
    ),
  );
  expect(result.score.payments).toStrictEqual([
    { from: "dealer", amount: 800 },
    { from: "non_dealer", amount: 500 },
    { from: "non_dealer", amount: 500 },
  ]);
  expect(result.score.total).toBe(3800);
});

test("本場・供託を省略した入力は0として扱われる", () => {
  const withDefaults = ScoreCalculation.calculate(calcInput());
  const withZero = ScoreCalculation.calculate(
    calcInput({ honba: 0, kyotaku: 0 }),
  );
  expect(withDefaults).toStrictEqual(withZero);
});
