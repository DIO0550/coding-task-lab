import { test, expect } from "vitest";

import { Game } from "../index.ts";
import type { GameState, RoundResult } from "../index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  actionTypes,
  startWithOrder,
  t,
  tsumogiri,
} from "./helpers.ts";

/** 2s/5s 待ちのタンヤオ確定テンパイ */
const TANYAO_WAIT = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8p", "8p", "3s", "4s"];

const winYakuNames = (state: GameState): readonly string[] => {
  const result = state.result;
  if (result?.kind !== "win" || !result.score.valid) {
    throw new Error("expected a valid win result");
  }
  return result.score.yaku.map((yaku) => yaku.name);
};

const winResult = (state: GameState): Extract<RoundResult, { kind: "win" }> => {
  const result = state.result;
  if (result?.kind !== "win") {
    throw new Error("expected a win result");
  }
  return result;
};

test("最後のツモ牌での和了は海底摸月になる", () => {
  const state = startWithOrder({
    hands: [JUNK_A, TANYAO_WAIT, JUNK_B, JUNK_C],
    draws: ["1p"],
  });
  // 山を残り5枚へ差し替え、一巡してから seat1 が海底牌 5s をツモる
  const nearEmpty: GameState = {
    ...state,
    wall: {
      ...state.wall,
      drawPile: [t("9m"), t("7m"), t("9p"), t("1s"), t("5s")],
    },
  };

  const drew = [0, 1, 2, 3, 4].reduce((s) => tsumogiri(s), nearEmpty);
  expect(drew.turn).toBe(1);
  expect(Game.viewFor(drew, 1).wallRemaining).toBe(0);

  const won = Game.apply(drew, 1, { type: "tsumo" });

  expect(winYakuNames(won)).toContain("haitei");
  expect(winYakuNames(won)).not.toContain("chihou");
});

test("最後の打牌へのロンは河底撈魚になる", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["1p"],
  });
  const nearEmpty: GameState = {
    ...state,
    wall: { ...state.wall, drawPile: [t("5s")] },
  };

  const drew = tsumogiri(nearEmpty);
  const responding = Game.apply(drew, 1, { type: "discard", tile: t("5s") });
  expect(responding.phase).toBe("response");

  const won = Game.apply(responding, 2, { type: "ron" });

  expect(winYakuNames(won)).toContain("houtei");
});

test("親の配牌ツモでの和了は天和になる", () => {
  const state = startWithOrder({
    hands: [TANYAO_WAIT, JUNK_A, JUNK_B, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["ton"],
  });

  expect(actionTypes(Game.legalActions(state, 0))).toContain("tsumo");
  const won = Game.apply(state, 0, { type: "tsumo" });

  expect(winYakuNames(won)).toContain("tenhou");
  // 役満の親ツモ: 子3人が16000点ずつ支払う
  expect(winResult(won).pointDeltas).toEqual([48000, -16000, -16000, -16000]);
});

test("子の第一ツモでの和了は地和になる", () => {
  const state = startWithOrder({
    hands: [JUNK_A, TANYAO_WAIT, JUNK_B, JUNK_C],
    draws: ["1p", "5s"],
    doraIndicators: ["ton"],
  });

  const drew = tsumogiri(state);
  const won = Game.apply(drew, 1, { type: "tsumo" });

  expect(winYakuNames(won)).toContain("chihou");
});

test("嶺上牌での和了は嶺上開花になる", () => {
  // 555p 234m 456s 78p tonton: 5p を暗槓し嶺上の 9p で 789p が完成する
  const kanHand = ["5p", "5p", "5p", "2m", "3m", "4m", "4s", "5s", "6s", "7p", "8p", "ton", "ton"];
  const junkNo5p = ["1m", "4m", "7m", "2p", "9p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const state = startWithOrder({
    hands: [kanHand, junkNo5p, JUNK_B, JUNK_C],
    draws: ["5p"],
    rinshan: ["9p"],
  });

  const kanned = Game.apply(state, 0, {
    type: "kan",
    tile: t("5p"),
    kind: "ankan",
  });
  expect(actionTypes(Game.legalActions(kanned, 0))).toContain("tsumo");

  const won = Game.apply(kanned, 0, { type: "tsumo" });

  expect(winYakuNames(won)).toContain("rinshan");
  expect(winYakuNames(won)).not.toContain("tenhou");
});

test("加槓に対して槍槓でロンできる", () => {
  const dealer = ["1m", "4m", "7m", "2p", "1p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const ponSeat = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const chankanSeat = ["2m", "3m", "4m", "6s", "7s", "8s", "1s", "1s", "9p", "9p", "9p", "3p", "4p"];
  const state = startWithOrder({
    hands: [dealer, JUNK_B, ponSeat, chankanSeat],
    draws: ["5p", "9s", "2s", "8m", "5p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  const ponned = Game.apply(responding, 2, {
    type: "pon",
    tiles: [t("5p"), t("5p")],
  });
  const discarded = Game.apply(ponned, 2, { type: "discard", tile: t("nan") });
  // seat3→0→1 がツモ切りし seat2 が4枚目の 5p をツモって加槓を宣言する
  const beforeKakan = [0, 1, 2].reduce((s) => tsumogiri(s), discarded);
  expect(beforeKakan.turn).toBe(2);

  const declared = Game.apply(beforeKakan, 2, {
    type: "kan",
    tile: t("5p"),
    kind: "kakan",
  });

  expect(declared.phase).toBe("response");
  expect(declared.pendingResponders).toEqual([3]);
  expect(actionTypes(Game.legalActions(declared, 3))).toEqual(["ron", "pass"]);

  const won = Game.apply(declared, 3, { type: "ron" });

  expect(winYakuNames(won)).toContain("chankan");
  expect(winResult(won)).toMatchObject({ winner: 3, loser: 2, winType: "ron" });
});

test("槍槓を全員が見逃すと加槓が成立して嶺上ツモする", () => {
  const dealer = ["1m", "4m", "7m", "2p", "1p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const ponSeat = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const chankanSeat = ["2m", "3m", "4m", "6s", "7s", "8s", "1s", "1s", "9p", "9p", "9p", "3p", "4p"];
  const state = startWithOrder({
    hands: [dealer, JUNK_B, ponSeat, chankanSeat],
    draws: ["5p", "9s", "2s", "8m", "5p"],
    rinshan: ["7m"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  const ponned = Game.apply(responding, 2, {
    type: "pon",
    tiles: [t("5p"), t("5p")],
  });
  const discarded = Game.apply(ponned, 2, { type: "discard", tile: t("nan") });
  const beforeKakan = [0, 1, 2].reduce((s) => tsumogiri(s), discarded);
  const declared = Game.apply(beforeKakan, 2, {
    type: "kan",
    tile: t("5p"),
    kind: "kakan",
  });

  const passed = Game.apply(declared, 3, { type: "pass" });

  expect(passed.phase).toBe("action");
  expect(passed.turn).toBe(2);
  expect(passed.players[2].melds[0].meld.type).toBe("kan");
  expect(passed.players[2].melds[0].meld.tiles).toHaveLength(4);
  expect(passed.players[2].drawn).not.toBeNull();
  expect(passed.wall.doraIndicators).toHaveLength(2);
});
