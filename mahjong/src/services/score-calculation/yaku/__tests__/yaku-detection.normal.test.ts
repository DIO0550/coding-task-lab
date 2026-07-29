import { expect, test } from "vitest";

import { YakuDetection } from "../index.ts";
import { hanOf, totalHan, winningHandOf, yakuNames } from "./winning-hand-fixture.ts";

test("平和だけが成立する手では平和のみを返す", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s",
      winTile: "4s",
    }),
  );
  expect(yaku).toStrictEqual([{ name: "pinfu", han: 1 }]);
});

test("状況役と手役はまとめて返される", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 6s 7s 8s 5m 5m",
      winTile: "8s",
      winType: "tsumo",
      riichi: "riichi",
      ippatsu: true,
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([
    "ippatsu",
    "menzen_tsumo",
    "pinfu",
    "riichi",
    "tanyao",
  ]);
});

test("立直・一発・門前ツモ・平和・断么九の複合は合計5翻になる", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 6s 7s 8s 5m 5m",
      winTile: "8s",
      winType: "tsumo",
      riichi: "riichi",
      ippatsu: true,
    }),
  );
  expect(totalHan(yaku)).toBe(5);
});

test("ドラを指定しても役の一覧にはドラは含まれない", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 6s 7s 8s 5m 5m",
      winTile: "8s",
      dora: "5m 2m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["pinfu", "tanyao"]);
});

test("役が1つも成立しない手では空の一覧を返す", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 5p 6p 7p 2s 3s 4s 6s 7s 8s 5m 5m",
      winTile: "3s",
    }),
  );
  expect(yaku).toStrictEqual([]);
});

test("喰いタンは1翻として成立する", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 5m 5m",
      melds: ["chi 6s 7s 8s"],
      winTile: "4s",
    }),
  );
  expect(yaku).toStrictEqual([{ name: "tanyao", han: 1 }]);
});

test("副露した手では門前限定役を除いた役だけが返る", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "2m 2m 3m 3m 4m 4m 5p 6p 7p chun chun",
      melds: ["chi 2s 3s 4s"],
      winTile: "7p",
      riichi: "riichi",
      ippatsu: true,
      winType: "tsumo",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("七対子は2翻として成立する", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 4m 4m 7p 7p 2s 2s 5s 5s ton ton chun chun",
      winTile: "chun",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yaku).toStrictEqual([{ name: "chiitoitsu", han: 2 }]);
});

test("役牌の刻子と混一色は複合する", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4m 5m 6m 7m 8m 9m ton ton ton 5m 5m",
      winTile: "3m",
      roundWind: "ton",
      seatWind: "nan",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([
    "honitsu",
    "ittsu",
    "yakuhai_round_wind",
  ]);
});

test("河底でロン和了した副露手では河底撈魚が成立する", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "2m 3m 4m 5p 6p 7p 2s 3s 4s 5m 5m",
      melds: ["chi 6s 7s 8s"],
      winTile: "4s",
      situational: ["houtei"],
    }),
  );
  expect(hanOf(yaku, "houtei_raoyui")).toBe(1);
});
