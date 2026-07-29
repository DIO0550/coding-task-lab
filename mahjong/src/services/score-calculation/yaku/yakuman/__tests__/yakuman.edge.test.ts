import { expect, test } from "vitest";

import {
  winningHandOf,
  yakuNames,
} from "../../__tests__/winning-hand-fixture.ts";
import { YakumanDetection } from "../index.ts";

test("ロンで完成した刻子は明刻として扱われ四暗刻は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 5p 5p 5p 8s 8s 8s ton ton ton 9m 9m",
      winTile: "2m",
      winBlock: "triplet:2m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("三元牌の刻子が2つでは大三元は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "haku haku haku hatsu hatsu hatsu 2m 3m 4m 5p 6p 7p 9s 9s",
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("風牌の刻子が3つでも雀頭が風牌でなければ小四喜は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan sha sha sha 2m 3m 4m 9s 9s",
      winTile: "4m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("緑でない索子が混ざると緑一色は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1s 1s 1s 2s 2s 2s 3s 3s 3s 4s 4s 6s 6s 6s",
      form: "triplet:1s triplet:2s triplet:3s triplet:6s pair:4s",
      winTile: "6s",
      winBlock: "triplet:6s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("副露した手では九蓮宝燈は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 2m 3m 4m 5m 5m",
      melds: ["chi 6m 7m 8m", "pon 9m 9m 9m"],
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("清一色でも1112345678999形でなければ九蓮宝燈は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5m 6m 7m 2m 3m 4m 8m 8m 8m 5m 5m",
      form: "run:2m run:2m run:5m triplet:8m pair:5m",
      winTile: "7m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("槓子が3つでは四槓子は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 9s 9s",
      melds: ["ankan 5p 5p 5p 5p", "ankan 8s 8s 8s 8s", "ankan 9p 9p 9p 9p"],
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("么九牌だけの七対子形でも国士無双は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 9m 9m 1p 1p 9p 9p 1s 1s ton ton chun chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("役が何も無い平凡な手では役満は成立しない", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s",
      winTile: "4s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});
