import { expect, test } from "vitest";

import {
  hanOf,
  winningHandOf,
  yakuNames,
} from "../../__tests__/winning-hand-fixture.ts";
import { SituationalYakuDetection } from "../index.ts";

/** 平和形の門前手(状況役以外の役に影響されない)。 */
const MENZEN_HAND = "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s";

/** 副露のある手(門前限定の状況役が成立しないことの確認用)。 */
const OPEN_HAND = "2m 3m 4m 5p 6p 7p 2s 3s 4s 5m 5m";

test("立直して和了すると立直が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({ concealed: MENZEN_HAND, winTile: "4s", riichi: "riichi" }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["riichi"]);
});

test("ダブル立直で和了するとダブル立直だけが成立し立直は重複しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({ concealed: MENZEN_HAND, winTile: "4s", riichi: "double" }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["double_riichi"]);
});

test("立直後の一巡以内に和了すると一発が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      riichi: "riichi",
      ippatsu: true,
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["ippatsu", "riichi"]);
});

test("門前でツモ和了すると門前清自摸和が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({ concealed: MENZEN_HAND, winTile: "4s", winType: "tsumo" }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["menzen_tsumo"]);
});

test("海底の牌をツモって和了すると海底摸月が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      winType: "tsumo",
      situational: ["haitei"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["haitei_raoyue", "menzen_tsumo"]);
});

test("河底の牌でロン和了すると河底撈魚が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      situational: ["houtei"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["houtei_raoyui"]);
});

test("嶺上牌をツモって和了すると嶺上開花が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      winType: "tsumo",
      situational: ["rinshan"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["menzen_tsumo", "rinshan_kaihou"]);
});

test("加槓の牌でロン和了すると搶槓が成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      situational: ["chankan"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chankan"]);
});

test("天和は役満として成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      winType: "tsumo",
      seatWind: "ton",
      situational: ["tenhou"],
    }),
  );
  expect(hanOf(yaku, "tenhou")).toBe(13);
});

test("地和は役満として成立する", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      winType: "tsumo",
      situational: ["chihou"],
    }),
  );
  expect(hanOf(yaku, "chihou")).toBe(13);
});

test("副露した手のツモ和了では門前清自摸和は成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: OPEN_HAND,
      melds: ["chi 6s 7s 8s"],
      winTile: "4s",
      winType: "tsumo",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});
