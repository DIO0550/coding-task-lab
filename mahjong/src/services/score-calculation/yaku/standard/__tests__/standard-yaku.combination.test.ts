import { expect, test } from "vitest";

import {
  totalHan,
  winningHandOf,
  yakuNames,
} from "../../__tests__/winning-hand-fixture.ts";
import { StandardYakuDetection } from "../index.ts";

test("全ての牌が么九牌の副露手では混老頭・対々和・チャンタ・三暗刻が複合する", () => {
  const yaku = StandardYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 9m 9m 9m 1p 1p 1p chun chun",
      melds: ["pon ton ton ton"],
      winTile: "chun",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([
    "chanta",
    "honroutou",
    "sanankou",
    "toitoi",
  ]);
});

test("順子・刻子・牌構成の役はまとめて返される", () => {
  const yaku = StandardYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m ton ton ton 5m 5m",
      winTile: "3m",
      roundWind: "ton",
      seatWind: "ton",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([
    "honitsu",
    "ittsu",
    "yakuhai_round_wind",
    "yakuhai_seat_wind",
  ]);
});

test("混一色・一気通貫・連風牌の複合は合計7翻になる", () => {
  const yaku = StandardYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m ton ton ton 5m 5m",
      winTile: "3m",
      roundWind: "ton",
      seatWind: "ton",
    }),
  );
  expect(totalHan(yaku)).toBe(7);
});

test("国士無双形では通常役は1つも成立しない", () => {
  const yaku = StandardYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("平和と断么九と一盃口は複合する", () => {
  const yaku = StandardYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 3m 3m 4m 4m 5p 6p 7p 2s 3s 4s 5s 5s",
      winTile: "7p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["iipeiko", "pinfu", "tanyao"]);
});
