import { expect, test } from "vitest";

import {
  winningHandOf,
  yakuNames,
} from "../../../__tests__/winning-hand-fixture.ts";
import { RunYakuDetection } from "../index.ts";

/** 面子がすべて順子で雀頭が 5s の門前手。 */
const PINFU_HAND = "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s";

test("門前で両面待ち・役牌でない雀頭のとき平和が成立する", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({ concealed: PINFU_HAND, winTile: "4s" }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["pinfu"]);
});

test("嵌張待ちで和了した手では平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({ concealed: PINFU_HAND, winTile: "3s" }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("雀頭が場風牌のとき平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s ton ton",
      winTile: "4s",
      roundWind: "ton",
      seatWind: "nan",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("雀頭が自風牌のとき平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s ton ton",
      winTile: "4s",
      roundWind: "nan",
      seatWind: "ton",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("雀頭が三元牌のとき平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s chun chun",
      winTile: "4s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("雀頭が場風でも自風でもない風牌なら平和が成立する", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s ton ton",
      winTile: "4s",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["pinfu"]);
});

test("副露した手では平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 2s 3s 4s 5s 5s",
      melds: ["chi 7p 8p 9p"],
      winTile: "4s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("刻子を含む手では平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 9p 9p 9p 2s 3s 4s 5s 5s",
      winTile: "4s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("七対子形では平和は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 4m 4m 7p 7p 2s 2s 5s 5s ton ton chun chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});
