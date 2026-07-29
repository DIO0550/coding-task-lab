import { expect, test } from "vitest";

import {
  hanOf,
  winningHandOf,
  yakuNames,
} from "../../../__tests__/winning-hand-fixture.ts";
import { CompositionYakuDetection } from "../index.ts";

test("全てのブロックが么九牌を含み字牌もある手ではチャンタが成立する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 7p 8p 9p 1s 2s 3s ton ton ton 9m 9m",
      winTile: "3s",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chanta"]);
});

test("副露したチャンタは1翻になる", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 7p 8p 9p 1s 2s 3s 9m 9m",
      melds: ["pon ton ton ton"],
      winTile: "3s",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(hanOf(yaku, "chanta")).toBe(1);
});

test("字牌を含まず全てのブロックが老頭牌を含む手では純チャンが成立しチャンタは成立しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 7p 8p 9p 1s 2s 3s 9s 9s 9s 9m 9m",
      winTile: "3s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["junchan"]);
});

test("么九牌を含まないブロックが1つでもあればチャンタは成立しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 7p 8p 9p 4s 5s 6s ton ton ton 9m 9m",
      winTile: "6s",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("全ての牌が么九牌で字牌を含む手では混老頭とチャンタが複合する", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 9m 9m 9m 1p 1p 1p chun chun",
      melds: ["pon ton ton ton"],
      winTile: "chun",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chanta", "honroutou"]);
});

test("七対子形の混老頭ではチャンタは複合しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 9m 9m 1p 1p 9p 9p 1s 1s ton ton chun chun",
      winTile: "chun",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chiitoitsu", "honroutou"]);
});

test("字牌を含まず老頭牌だけの手では混老頭は成立しない", () => {
  const yaku = CompositionYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 9m 9m 9m 1p 1p 1p 1s 1s",
      melds: ["pon 9s 9s 9s"],
      winTile: "1s",
    }),
  );
  expect(hanOf(yaku, "honroutou")).toBe(0);
});
