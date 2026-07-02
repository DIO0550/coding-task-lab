import { test, expect } from "vitest";

import { ScoreCalculation } from "../index.ts";
import { asWin, calcInput, sortYaku } from "./input-factory.ts";

test("三色同刻は2翻になり暗刻は三暗刻と複合する", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "2m", "2m", "2p", "2p", "2p", "2s", "2s", "2s",
          "3m", "4m", "9m", "9m",
        ],
        winTile: "5m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "sanshoku_doukou", han: 2 },
      { name: "sanankou", han: 2 },
    ]),
  );
  expect(result.han).toBe(4);
  expect(result.fu).toBe(50);
  expect(result.score.total).toBe(8000);
});

test("三槓子は2翻になり槓子の符が加算される", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["3s", "4s", "8m", "8m"],
        melds: [
          { type: "kan", tiles: ["2m", "2m", "2m", "2m"] },
          { type: "ankan", tiles: ["5p", "5p", "5p", "5p"] },
          { type: "kan", tiles: ["ton", "ton", "ton", "ton"] },
        ],
        winTile: "5s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  // 20 + 明槓2m(8) + 暗槓5p(16) + 明槓ton(16) = 60符
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "sankantsu", han: 2 },
      { name: "round_wind", han: 1 },
    ]),
  );
  expect(result.han).toBe(3);
  expect(result.fu).toBe(60);
  expect(result.score.total).toBe(7700);
});

test("字牌を含む全帯么九はチャンタ2翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "2m", "3m", "7p", "8p", "9p", "1s", "2s", "3s",
          "ton", "ton", "ton", "9m",
        ],
        winTile: "9m",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "chanta", han: 2 },
      { name: "round_wind", han: 1 },
    ]),
  );
  expect(result.han).toBe(3);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(5200);
});

test("字牌のない全帯么九は純チャン3翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "2m", "3m", "7p", "8p", "9p", "1s", "2s", "3s",
          "9s", "9s", "9s", "1p",
        ],
        winTile: "1p",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "junchan", han: 3 }]);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(5200);
});

test("小三元は三元牌2種の刻子と複合して4翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "haku", "haku", "haku", "hatsu", "hatsu", "hatsu",
          "chun", "chun", "2m", "3m", "4m", "7s", "8s",
        ],
        winTile: "9s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "shousangen", han: 2 },
      { name: "haku", han: 1 },
      { name: "hatsu", han: 1 },
    ]),
  );
  expect(result.han).toBe(4);
  expect(result.score.total).toBe(8000);
});

test("混老頭は対々和・三暗刻と複合して跳満になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "1m", "1m", "1m", "9p", "9p", "9p", "1s", "1s", "1s",
          "ton", "ton", "9m", "9m",
        ],
        winTile: "ton",
        winType: "ron",
        seatWind: "sha",
        roundWind: "nan",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "toitoi", han: 2 },
      { name: "sanankou", han: 2 },
      { name: "honroutou", han: 2 },
    ]),
  );
  expect(result.han).toBe(6);
  expect(result.score.total).toBe(12000);
});

test("副露した混一色は2翻に喰い下がる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["1p", "2p", "3p", "5p", "6p", "7p", "9p", "9p", "9p", "2p"],
        melds: [{ type: "pon", tiles: ["haku", "haku", "haku"] }],
        winTile: "2p",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "honitsu", han: 2 },
      { name: "haku", han: 1 },
    ]),
  );
  expect(result.han).toBe(3);
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(5200);
});

test("副露した清一色は5翻に喰い下がる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["4s", "5s", "6s", "6s", "7s", "8s", "2s", "2s", "9s", "9s"],
        melds: [{ type: "chi", tiles: ["1s", "2s", "3s"] }],
        winTile: "9s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "chinitsu", han: 5 }]);
  expect(result.han).toBe(5);
  expect(result.score.total).toBe(8000);
});

test("副露した一気通貫は1翻に喰い下がる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: ["4m", "5m", "6m", "7m", "8m", "9m", "5p", "5p", "pei", "pei"],
        melds: [{ type: "chi", tiles: ["1m", "2m", "3m"] }],
        winTile: "pei",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(result.yaku).toStrictEqual([{ name: "ittsu", han: 1 }]);
  expect(result.fu).toBe(30);
  expect(result.score.total).toBe(1000);
});

test("一盃口は門前で1翻になる", () => {
  const result = asWin(
    ScoreCalculation.calculate(
      calcInput({
        hand: [
          "2m", "3m", "4m", "2m", "3m", "4m", "5p", "6p", "7p",
          "haku", "haku", "haku", "9s",
        ],
        winTile: "9s",
        winType: "ron",
        seatWind: "nan",
        roundWind: "ton",
      }),
    ),
  );
  expect(sortYaku(result.yaku)).toStrictEqual(
    sortYaku([
      { name: "iipeiko", han: 1 },
      { name: "haku", han: 1 },
    ]),
  );
  expect(result.fu).toBe(40);
  expect(result.score.total).toBe(2600);
});
