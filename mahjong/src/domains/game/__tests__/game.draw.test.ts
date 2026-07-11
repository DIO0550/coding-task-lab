import { test, expect } from "vitest";

import { Game } from "../index.ts";
import type { GameState, RoundResult } from "../index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  runToExhaustion,
  startWithOrder,
  t,
} from "./helpers.ts";

const JUNK_D = ["1m", "4m", "7m", "2p", "9p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
/** 5m/8m 待ちの面前テンパイ(234m 456p 789s 55s + 67m) */
const TENPAI_HAND = ["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "5s", "5s", "6m", "7m"];
/** 2s/5s 待ちの面前テンパイ(234m 456p 678s 88p + 34s) */
const TENPAI_HAND_2 = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8p", "8p", "3s", "4s"];

const drawResult = (
  state: GameState,
): Extract<RoundResult, { kind: "draw" }> => {
  const result = state.result;
  if (result?.kind !== "draw") {
    throw new Error("expected a draw result");
  }
  return result;
};

test("山が尽きると荒牌流局になり全員ノーテンなら点数移動はない", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, JUNK_C, JUNK_D],
  });

  const drawn = runToExhaustion(state);

  expect(drawn.phase).toBe("result_draw");
  const result = drawResult(drawn);
  expect(result.tenpai).toEqual([false, false, false, false]);
  expect(result.pointDeltas).toEqual([0, 0, 0, 0]);
  expect(result.dealerContinues).toBe(false);
});

test("テンパイ1人の流局はノーテン3人が1000点ずつ支払う", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
  });

  const drawn = runToExhaustion(state);

  const result = drawResult(drawn);
  expect(result.tenpai).toEqual([true, false, false, false]);
  expect(result.pointDeltas).toEqual([3000, -1000, -1000, -1000]);
  expect(result.pointDeltas.reduce((a, b) => a + b, 0)).toBe(0);
});

test("テンパイ2人の流局は1500点ずつやり取りされる", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, TENPAI_HAND_2, JUNK_B, JUNK_C],
  });

  const drawn = runToExhaustion(state);

  expect(drawResult(drawn).pointDeltas).toEqual([1500, 1500, -1500, -1500]);
});

test("テンパイ3人の流局はノーテン1人が3000点を支払う", () => {
  const noTen = ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const third = ["1p", "2p", "3p", "5s", "6s", "7s", "2m", "2m", "8m", "8m", "8m", "9p", "9p"];
  const state = startWithOrder({
    hands: [TENPAI_HAND, TENPAI_HAND_2, third, noTen],
  });

  const drawn = runToExhaustion(state);

  expect(drawResult(drawn).pointDeltas).toEqual([1000, 1000, 1000, -3000]);
});

test("親がテンパイで流局すると連荘し本場が1増える", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
  });

  const confirmed = Game.confirmResult(runToExhaustion(state));

  expect(confirmed.dealer).toBe(0);
  expect(confirmed.roundNumber).toBe(1);
  expect(confirmed.roundWind).toBe("ton");
  expect(confirmed.honba).toBe(1);
  expect(confirmed.phase).toBe("action");
});

test("親がノーテンで流局すると輪荘し本場が1増える", () => {
  const state = startWithOrder({
    hands: [JUNK_A, TENPAI_HAND, JUNK_B, JUNK_C],
  });

  const confirmed = Game.confirmResult(runToExhaustion(state));

  expect(confirmed.dealer).toBe(1);
  expect(confirmed.roundNumber).toBe(2);
  expect(confirmed.honba).toBe(1);
});

test("流局時の供託は回収されず次局へ持ち越される", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
    draws: ["ton"],
  });
  const declared = Game.apply(state, 0, { type: "riichi", tile: t("ton") });
  expect(declared.riichiSticks).toBe(1);

  const drawn = runToExhaustion(declared);
  expect(drawn.phase).toBe("result_draw");
  const confirmed = Game.confirmResult(drawn);

  expect(confirmed.riichiSticks).toBe(1);
  expect(confirmed.players[0].points).toBe(25000 - 1000 + 3000);
});

test("流局の点数はconfirmResultで各家の持ち点に反映される", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
  });

  const confirmed = Game.confirmResult(runToExhaustion(state));

  expect(confirmed.players.map((p) => p.points)).toEqual([
    28000, 24000, 24000, 24000,
  ]);
});
