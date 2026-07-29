import { expect, test } from "vitest";

import {
  winningHandOf,
  yakuNames,
} from "../../__tests__/winning-hand-fixture.ts";
import { SituationalYakuDetection } from "../index.ts";

/** 平和形の門前手(状況役以外の役に影響されない)。 */
const MENZEN_HAND = "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s";

test("立直していなければ一発は成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({ concealed: MENZEN_HAND, winTile: "4s", ippatsu: true }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("ロン和了では海底摸月は成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      situational: ["haitei"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("ツモ和了では河底撈魚は成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      winType: "tsumo",
      situational: ["houtei"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["menzen_tsumo"]);
});

test("ロン和了では嶺上開花は成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      situational: ["rinshan"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});

test("ツモ和了では搶槓は成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({
      concealed: MENZEN_HAND,
      winTile: "4s",
      winType: "tsumo",
      situational: ["chankan"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["menzen_tsumo"]);
});

test("状況役の指定が無ければ状況役は1つも成立しない", () => {
  const yaku = SituationalYakuDetection.detect(
    winningHandOf({ concealed: MENZEN_HAND, winTile: "4s" }),
  );
  expect(yakuNames(yaku)).toStrictEqual([]);
});
