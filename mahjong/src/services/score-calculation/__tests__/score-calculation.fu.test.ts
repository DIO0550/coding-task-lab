import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput } from "./input-factory.ts";

test("平和ツモは20符2翻(400/700)として計算される", () => {
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
      }),
    ),
  );
  expect(result.fu).toBe(20);
  expect(result.han).toBe(2);
  expect(result.score.total).toBe(1500);
  expect(result.score.payments).toStrictEqual([
    { from: "dealer", amount: 700 },
    { from: "non_dealer", amount: 400 },
    { from: "non_dealer", amount: 400 },
  ]);
});

test("七対子は25符固定になる", () => {
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
      }),
    ),
  );
  expect(result.fu).toBe(25);
});

test("門前の平和形ロンは30符になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s",
          "2s", "3s", "5m", "5m",
        ],
        winTile: "4s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
        riichi: "riichi",
      }),
    ),
  );
  expect(result.fu).toBe(30);
});

test("副露手で加符のない形(喰い平和形)のロンは30符に引き上げられる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["2p", "3p", "4p", "6p", "7p", "8p", "3s", "4s", "9s", "9s"],
        melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }],
        winTile: "2s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "sanshoku_doujun", han: 1 }]);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1000);
});

test("嵌張待ちと么九牌の暗刻は符に加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "5p", "7p", "3s", "4s", "5s",
          "ton", "ton", "ton", "8m", "8m",
        ],
        winTile: "6p",
        winType: "ron",
        seatWind: "ton",
        roundWind: "ton",
      }),
    ),
  );
  // 20 + 門前ロン10 + 東暗刻8 + 嵌張2 = 40
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(3900);
});

test("連風牌の雀頭は4符として加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "5p", "6p", "7p", "5s", "6s", "7s",
          "9s", "9s", "9s", "ton",
        ],
        winTile: "ton",
        winType: "ron",
        seatWind: "ton",
        roundWind: "ton",
        situational: ["houtei"],
      }),
    ),
  );
  // 20 + 門前ロン10 + 9s暗刻8 + 連風雀頭4 + 単騎2 = 44 → 50
  expect(result.fu).toBe(50);
});
