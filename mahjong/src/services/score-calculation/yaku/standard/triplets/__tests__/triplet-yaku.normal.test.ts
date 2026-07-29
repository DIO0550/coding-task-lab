import { expect, test } from "vitest";

import {
  winningHandOf,
  yakuNames,
} from "../../../__tests__/winning-hand-fixture.ts";
import { TripletYakuDetection } from "../index.ts";

test("面子がすべて刻子の手では対々和が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 9m 9m",
      melds: ["pon 5p 5p 5p", "pon 8s 8s 8s", "pon ton ton ton"],
      winTile: "9m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["toitoi"]);
});

test("暗刻が3つあると三暗刻が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 5p 5p 5p 8s 8s 8s 3m 4m 5m 9m 9m",
      winTile: "5m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["sanankou"]);
});

test("ロンで完成した刻子は明刻として扱われ三暗刻は成立しない", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 5p 5p 5p 8s 8s 8s 3m 4m 5m 9m 9m",
      winTile: "2m",
      winBlock: "triplet:2m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("ツモで完成した刻子は暗刻として扱われ三暗刻が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 5p 5p 5p 8s 8s 8s 3m 4m 5m 9m 9m",
      winTile: "2m",
      winBlock: "triplet:2m",
      winType: "tsumo",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["sanankou"]);
});

test("槓子が3つあると三槓子が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 9s 9s",
      melds: ["ankan 5p 5p 5p 5p", "ankan 8s 8s 8s 8s", "ankan 9p 9p 9p 9p"],
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["sanankou", "sankantsu"]);
});

test("三色が同じ数の刻子で揃うと三色同刻が成立する", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 2p 2p 2p 2s 2s 2s 5m 6m 7m 9s 9s",
      winTile: "7m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["sanankou", "sanshoku_doukou"]);
});

test("刻子が3つでも数が異なれば三色同刻は成立しない", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 3p 3p 3p 2s 2s 2s 5m 6m 7m 9s 9s",
      winTile: "7m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["sanankou"]);
});

test("七対子形では対々和は成立しない", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 4m 4m 7p 7p 2s 2s 5s 5s ton ton chun chun",
      winTile: "chun",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("三元牌の刻子が2つでも雀頭が三元牌でなければ小三元は成立しない", () => {
  const yaku = TripletYakuDetection.detect(
    winningHandOf({
      concealed: "haku haku haku hatsu hatsu hatsu 2m 3m 4m 5p 6p 7p 9s 9s",
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["yakuhai_haku", "yakuhai_hatsu"]);
});
