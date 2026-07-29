import { expect, test } from "vitest";

import { ScoreIo } from "../index.ts";

test("仕様の入力例は和了として点数計算される", () => {
  const input = JSON.stringify({
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
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
  });

  expect(ScoreIo.evaluate(input)).toStrictEqual({
    valid: true,
    yaku: [
      { name: "yakuhai_round_wind", han: 1 },
      { name: "yakuhai_seat_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: {
      total: 3900,
      limit: "none",
      payments: [{ from: "discarder", amount: 3900 }],
    },
  });
});

test("副露を含む入力も点数計算できる", () => {
  const input = JSON.stringify({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "5s", "6m", "6m"],
    melds: [{ type: "pon", tiles: ["8s", "8s", "8s"] }],
    winTile: "5p",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });

  expect(ScoreIo.evaluate(input)).toMatchObject({
    valid: true,
    yaku: [{ name: "tanyao", han: 1 }],
    han: 1,
    fu: 30,
  });
});

test("和了形でない手牌は not_winning_hand になる", () => {
  const input = JSON.stringify({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "nan", "sha", "5m", "5m"],
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });

  expect(ScoreIo.evaluate(input)).toStrictEqual({
    valid: false,
    reason: "not_winning_hand",
  });
});

test("役がない手牌は no_yaku になる", () => {
  const input = JSON.stringify({
    hand: ["1m", "2m", "3m", "5p", "6p", "7p", "1s", "2s", "3s", "4m", "5m", "6m", "ton", "ton"],
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });

  expect(ScoreIo.evaluate(input)).toStrictEqual({
    valid: false,
    reason: "no_yaku",
  });
});

test("出力はJSON文字列としても取得できる", () => {
  const input = JSON.stringify({
    hand: ["1m", "1m"],
    winTile: "1m",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
  });

  expect(ScoreIo.evaluateToJson(input)).toBe(
    '{"valid":false,"reason":"invalid_input"}',
  );
});
