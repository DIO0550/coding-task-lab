import { expect, test } from "vitest";

import {
  hanOf,
  winningHandOf,
  yakuNames,
} from "../../../__tests__/winning-hand-fixture.ts";
import { CompositionYakuDetection } from "../index.ts";

test("中張牌だけで構成された手では断么九が成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 6s 7s 8s 5m 5m",
      winTile: "8s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["tanyao"]);
});

test("副露していても中張牌だけなら断么九が成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 5m 5m",
      melds: ["chi 6s 7s 8s"],
      winTile: "4s",
    }),
  );
  expect(hanOf(yaku, "tanyao")).toBe(1);
});

test("么九牌を含む手では断么九は成立しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 5p 6p 7p 2s 3s 4s 6s 7s 8s 5m 5m",
      winTile: "8s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("対子7つの和了形では七対子が成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 4m 4m 7p 7p 2s 2s 5s 5s ton ton chun chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chiitoitsu"]);
});

test("副露のある手では七対子も一盃口も成立しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 3m 3m 4m 4m 6p 7p 8p 9s 9s",
      melds: ["pon chun chun chun"],
      winTile: "8p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("一種類の数牌と字牌だけで構成された手では混一色が成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m ton ton ton 5m 5m",
      winTile: "3m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["honitsu"]);
});

test("門前の混一色は3翻になる", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m ton ton ton 5m 5m",
      winTile: "3m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(hanOf(yaku, "honitsu")).toBe(3);
});

test("副露した混一色は2翻になる", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 5m 5m",
      melds: ["pon ton ton ton", "chi 7m 8m 9m"],
      winTile: "6m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(hanOf(yaku, "honitsu")).toBe(2);
});

test("七対子形でも一種類の数牌と字牌だけなら混一色が成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 3m 3m 5m 5m 7m 7m 9m 9m ton ton chun chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chiitoitsu", "honitsu"]);
});

test("一種類の数牌だけで構成された手では清一色が成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5m 6m 7m 2m 3m 4m 8m 8m 8m 5m 5m",
      form: "run:2m run:2m run:5m triplet:8m pair:5m",
      winTile: "7m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chinitsu", "tanyao"]);
});

test("門前の清一色は6翻になる", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5m 6m 7m 2m 3m 4m 8m 8m 8m 5m 5m",
      form: "run:2m run:2m run:5m triplet:8m pair:5m",
      winTile: "7m",
    }),
  );
  expect(hanOf(yaku, "chinitsu")).toBe(6);
});

test("副露した清一色は5翻になる", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5m 6m 7m 2m 3m 4m 5m 5m",
      melds: ["pon 8m 8m 8m"],
      form: "run:2m run:2m run:5m triplet:8m pair:5m",
      winTile: "7m",
    }),
  );
  expect(hanOf(yaku, "chinitsu")).toBe(5);
});

test("字牌を含む手では清一色は成立しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m ton ton ton 5m 5m",
      winTile: "3m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(hanOf(yaku, "chinitsu")).toBe(0);
});
