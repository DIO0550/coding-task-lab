import { expect, test } from "vitest";

import {
  totalHan,
  winningHandOf,
  yakuNames,
} from "../../../__tests__/winning-hand-fixture.ts";
import { TripletYakuDetection } from "../index.ts";

/** 三元牌の刻子1つと順子3つ・雀頭で構成した手。 */
const dragonHand = (dragon: string): string =>
  `${dragon} ${dragon} ${dragon} 2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s`;

test.each([
  ["haku", "yakuhai_haku"],
  ["hatsu", "yakuhai_hatsu"],
  ["chun", "yakuhai_chun"],
])("%s の刻子があると役牌が成立する", (dragon, expected) => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({ concealed: dragonHand(dragon), winTile: "4s" }),
  );
  expect(yakuNames(yaku)).toStrictEqual([expected]);
});

test("場風牌の刻子があると場風の役牌が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "ton ton ton 2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s",
      winTile: "4s",
      roundWind: "ton",
      seatWind: "nan",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["yakuhai_round_wind"]);
});

test("自風牌の刻子があると自風の役牌が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "nan nan nan 2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s",
      winTile: "4s",
      roundWind: "ton",
      seatWind: "nan",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["yakuhai_seat_wind"]);
});

test("連風牌の刻子は場風と自風の両方が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "ton ton ton 2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s",
      winTile: "4s",
      roundWind: "ton",
      seatWind: "ton",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([
    "yakuhai_round_wind",
    "yakuhai_seat_wind",
  ]);
});

test("連風牌の刻子は合計2翻になる", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "ton ton ton 2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s",
      winTile: "4s",
      roundWind: "ton",
      seatWind: "ton",
    }),
  );
  expect(totalHan(yaku)).toBe(2);
});

test("場風でも自風でもない風牌の刻子では役牌は成立しない", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "sha sha sha 2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s",
      winTile: "4s",
      roundWind: "ton",
      seatWind: "nan",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("副露した役牌の刻子でも1翻として成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 9s 9s",
      melds: ["pon haku haku haku"],
      winTile: "4s",
    }),
  );
  expect(totalHan(yaku)).toBe(1);
});

test("三元牌の刻子2つと三元牌の雀頭で小三元が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "haku haku haku hatsu hatsu hatsu chun chun 2m 3m 4m 5p 6p 7p",
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([
    "shousangen",
    "yakuhai_haku",
    "yakuhai_hatsu",
  ]);
});
