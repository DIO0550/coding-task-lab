import { test, expect } from "vitest";

import { Game } from "../index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  actionTypes,
  n,
  startWithOrder,
  t,
  tsumogiriTimes,
} from "./helpers.ts";

/** 2s/5s 待ちのタンヤオ確定テンパイ(234m 456p 678s 88p + 34s) */
const TANYAO_WAIT = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8p", "8p", "3s", "4s"];

test("自分の河に待ち牌があるとロンできない(フリテン)", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["1p", "9m", "2s", "9p", "5s"],
  });
  // seat2 が待ち牌の一つ 2s をツモ切りして河に置く
  const furiten = tsumogiriTimes(state, 4);
  expect(furiten.players[2].discards.map((d) => n(d.tile))).toContain("2s");

  // 親が 5s(もう一つの待ち牌)を切ってもロンの機会は発生しない
  const after = Game.apply(furiten, 0, { type: "discard", tile: t("5s") });

  expect(after.phase).toBe("action");
  expect(after.turn).toBe(1);
  expect(Game.legalActions(after, 2)).toEqual([]);
});

test("フリテンでもツモ和了はできる", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["1p", "9m", "2s", "9p", "5s", "8m", "5s"],
  });
  const furiten = tsumogiriTimes(state, 4);
  // 親の 5s は誰にも鳴かれず流れ、seat1 もツモ切りし、seat2 が 5s をツモる
  const drew = tsumogiriTimes(furiten, 2);

  expect(drew.turn).toBe(2);
  expect(actionTypes(Game.legalActions(drew, 2))).toContain("tsumo");

  const won = Game.apply(drew, 2, { type: "tsumo" });
  expect(won.phase).toBe("result_win");
});

test("リーチ後に和了牌を見逃すと以降ロンできない", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["1p", "9m", "9p", "1s", "5s", "8m", "3p", "7m", "5s"],
  });
  const beforeRiichi = tsumogiriTimes(state, 2);
  const declared = Game.apply(beforeRiichi, 2, {
    type: "riichi",
    tile: t("9p"),
  });
  // seat3 がツモ切りし、親が待ち牌 5s をツモ切りする
  const seat3Discarded = tsumogiriTimes(declared, 1);
  const dealerDiscards = Game.apply(seat3Discarded, 0, {
    type: "discard",
    tile: t("5s"),
  });

  // 親の 5s にロンの機会が来るが見逃す(パス)
  expect(dealerDiscards.phase).toBe("response");
  expect(dealerDiscards.pendingResponders).toEqual([2]);
  const missed = Game.apply(dealerDiscards, 2, { type: "pass" });
  expect(missed.players[2].riichiFuriten).toBe(true);

  // 以降は同じ待ち牌が出てもロンの機会が発生しない
  const nextRound = tsumogiriTimes(missed, 3);
  const secondChance = Game.apply(nextRound, 0, {
    type: "discard",
    tile: t("5s"),
  });

  expect(secondChance.phase).toBe("action");
  expect(secondChance.turn).toBe(1);
  expect(Game.legalActions(secondChance, 2)).toEqual([]);
});
