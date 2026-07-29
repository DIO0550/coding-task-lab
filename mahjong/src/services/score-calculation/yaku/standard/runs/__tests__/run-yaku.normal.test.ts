import { expect, test } from "vitest";

import {
  hanOf,
  winningHandOf,
  yakuNames,
} from "../../../__tests__/winning-hand-fixture.ts";
import { RunYakuDetection } from "../index.ts";

test("門前で同一順子が1組あると一盃口が成立する", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 3m 3m 4m 4m 5p 6p 7p 2s 3s 4s chun chun",
      winTile: "7p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["iipeiko"]);
});

test("副露した手では一盃口は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 3m 3m 4m 4m 5p 6p 7p chun chun",
      melds: ["chi 2s 3s 4s"],
      winTile: "7p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("門前で同一順子が2組あると二盃口が成立し一盃口は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 3m 3m 4m 4m 6p 6p 7p 7p 8p 8p chun chun",
      form: "run:2m run:2m run:6p run:6p pair:chun",
      winTile: "8p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["ryanpeikou"]);
});

test("同じ色で1・4・7から始まる順子が揃うと一気通貫が成立する", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 3p 4p 5s 5s",
      winTile: "4p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["ittsu", "pinfu"]);
});

test("副露した一気通貫は1翻になる", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 2p 3p 4p 5s 5s",
      melds: ["chi 7m 8m 9m"],
      winTile: "4p",
    }),
  );
  expect(hanOf(yaku, "ittsu")).toBe(1);
});

test("門前の一気通貫は2翻になる", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 3p 4p 5s 5s",
      winTile: "4p",
    }),
  );
  expect(hanOf(yaku, "ittsu")).toBe(2);
});

test("三色が同じ数から始まる順子で揃うと三色同順が成立する", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 2p 3p 4p 2s 3s 4s 7m 8m 9m 5s 5s",
      winTile: "9m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["pinfu", "sanshoku_doujun"]);
});

test("副露した三色同順は1翻になる", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 2p 3p 4p 7m 8m 9m 5s 5s",
      melds: ["chi 2s 3s 4s"],
      winTile: "9m",
    }),
  );
  expect(hanOf(yaku, "sanshoku_doujun")).toBe(1);
});

test("同じ色の順子が3つあっても1・4・7で始まらなければ一気通貫は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 6m 7m 8m 2p 3p 4p 5s 5s",
      form: "run:1m run:4m run:6m run:2p pair:5s",
      winTile: "4p",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["pinfu"]);
});

test("色の違う順子が揃っていても数が異なれば三色同順は成立しない", () => {
  const yaku = RunYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 3p 4p 5p 2s 3s 4s 7m 8m 9m 5s 5s",
      winTile: "9m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["pinfu"]);
});
