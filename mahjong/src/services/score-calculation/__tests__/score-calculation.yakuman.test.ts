import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput } from "./input-factory.ts";

test("大三元は役満32000点になり通常役は複合しない", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["chun", "chun", "chun", "2s", "3s", "4s", "9m"],
        melds: [
          { type: "pon", tiles: ["haku", "haku", "haku"] },
          { type: "pon", tiles: ["hatsu", "hatsu", "hatsu"] },
        ],
        winTile: "9m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "daisangen", han: 13 }]);
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("四暗刻(双碰ツモ)はシングル役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "3m", "3m", "3m", "6p", "6p", "6p", "2s", "2s", "2s",
          "nan", "nan", "8s", "8s",
        ],
        winTile: "nan",
        winType: "tsumo",
        seatWind: "sha",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "suuankou", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("四暗刻単騎待ちはダブル役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "3m", "3m", "3m", "6p", "6p", "6p", "2s", "2s", "2s",
          "nan", "nan", "nan", "8s",
        ],
        winTile: "8s",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "suuankou_tanki", han: 26 }]);
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("大三元と字一色の複合はダブル役満64000点になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "haku", "haku", "haku", "hatsu", "hatsu", "hatsu",
          "chun", "chun", "chun", "nan",
        ],
        melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
        winTile: "nan",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([
    { name: "daisangen", han: 13 },
    { name: "tsuuiisou", han: 13 },
  ]);
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("役満の複合はダブル役満が上限になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha",
          "pei", "pei", "pei", "haku",
        ],
        winTile: "haku",
        winType: "tsumo",
        seatWind: "ton",
        roundWind: "ton",
      }),
    ),
  );
  // 四暗刻単騎 + 大四喜 + 字一色 = 5倍相当 → 2倍(ダブル役満)に丸める
  expect(result.yaku).toStrictEqual([
    { name: "suuankou_tanki", han: 26 },
    { name: "daisuushii", han: 26 },
    { name: "tsuuiisou", han: 13 },
  ]);
  expect(result.han).toBe(26);
  // 親ツモのダブル役満: 32000オール
  expect(result.score.payments).toStrictEqual([
    { from: "non_dealer", amount: 32000 },
    { from: "non_dealer", amount: 32000 },
    { from: "non_dealer", amount: 32000 },
  ]);
  expect(result.score.total).toBe(96000);
});

test("小四喜は役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha",
          "pei", "pei", "2s", "3s",
        ],
        winTile: "4s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "shousuushii", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("發のない緑一色も役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2s", "2s", "2s", "2s", "3s", "3s", "4s", "4s", "6s", "6s",
          "6s", "8s", "8s",
        ],
        winTile: "8s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "ryuuiisou", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("清老頭は役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p",
          "9s", "9s", "1s", "1s",
        ],
        winTile: "1s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "chinroutou", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("純正九蓮宝燈はダブル役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m",
          "9m", "9m", "9m",
        ],
        winTile: "5m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([
    { name: "junsei_chuuren_poutou", han: 26 },
  ]);
  expect(result.score.total).toBe(64000);
});

test("九蓮宝燈(非純正)はシングル役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m",
          "8m", "9m", "9m",
        ],
        winTile: "9m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "chuuren_poutou", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("四槓子は役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["chun"],
        melds: [
          { type: "ankan", tiles: ["1m", "1m", "1m", "1m"] },
          { type: "kan", tiles: ["5p", "5p", "5p", "5p"] },
          { type: "kan", tiles: ["9s", "9s", "9s", "9s"] },
          { type: "ankan", tiles: ["ton", "ton", "ton", "ton"] },
        ],
        winTile: "chun",
        winType: "tsumo",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "suukantsu", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("天和は役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
          "ton", "ton", "ton", "5m", "5m",
        ],
        winTile: "5m",
        winType: "tsumo",
        seatWind: "ton",
        roundWind: "ton",
        situational: ["tenhou"],
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "tenhou", han: 13 }]);
  expect(result.score.total).toBe(48000);
});

test("地和は役満になる", () => {
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
        situational: ["chihou"],
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "chihou", han: 13 }]);
  expect(result.score.total).toBe(32000);
});

test("字一色の七対子形も役満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "ton", "ton", "nan", "nan", "sha", "sha", "pei", "pei",
          "haku", "haku", "hatsu", "hatsu", "chun",
        ],
        winTile: "chun",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "tsuuiisou", han: 13 }]);
  expect(result.fu).toBe(25);
  expect(result.score.total).toBe(32000);
});
