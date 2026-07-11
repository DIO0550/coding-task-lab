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
  tsumogiriTimes,
} from "./helpers.ts";

/** 2s/5s 待ちのタンヤオ・ピンフ確定テンパイ(234m 456p 678s 88p + 34s) */
const TANYAO_WAIT = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8p", "8p", "3s", "4s"];
/** 5m/8m 待ちの面前テンパイ(234m 456p 789s 55s + 67m) */
const TENPAI_HAND = ["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "5s", "5s", "6m", "7m"];

const winResult = (state: GameState): Extract<RoundResult, { kind: "win" }> => {
  const result = state.result;
  if (result?.kind !== "win") {
    throw new Error("expected a win result");
  }
  return result;
};

test("子ロンの点数移動は放銃者が全額を支払い増減の合計が0になる", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["ton"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5s") });
  const won = Game.apply(responding, 2, { type: "ron" });

  const result = winResult(won);
  // タンヤオ+ピンフ 2翻30符 = 子ロン2000点
  expect(result.pointDeltas).toEqual([-2000, 0, 2000, 0]);
  expect(result.pointDeltas.reduce((a, b) => a + b, 0)).toBe(0);
  expect(result.dealerContinues).toBe(false);

  const confirmed = Game.confirmResult(won);
  expect(confirmed.players[0].points).toBe(23000);
  expect(confirmed.players[2].points).toBe(27000);
});

test("本場はロンの支払いに1本場300点ずつ加算される", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["ton"],
  });
  const twoHonba: GameState = { ...state, honba: 2 };

  const responding = Game.apply(twoHonba, 0, {
    type: "discard",
    tile: t("5s"),
  });
  const won = Game.apply(responding, 2, { type: "ron" });

  expect(winResult(won).pointDeltas).toEqual([-2600, 0, 2600, 0]);
});

test("親ロンは子ロンより高く支払われ親継続になる", () => {
  const state = startWithOrder({
    hands: [TANYAO_WAIT, JUNK_A, JUNK_B, JUNK_C],
    draws: ["9m", "5s"],
    doraIndicators: ["ton"],
  });

  const dealerPassed = tsumogiriTimes(state, 1);
  const responding = Game.apply(dealerPassed, 1, {
    type: "discard",
    tile: t("5s"),
  });
  const won = Game.apply(responding, 0, { type: "ron" });

  const result = winResult(won);
  // タンヤオ+ピンフ 2翻30符 = 親ロン2900点
  expect(result.pointDeltas).toEqual([2900, -2900, 0, 0]);
  expect(result.dealerContinues).toBe(true);
});

test("親ツモは子3人が同額を支払う", () => {
  const state = startWithOrder({
    hands: [TANYAO_WAIT, JUNK_A, JUNK_B, JUNK_C],
    draws: ["9m", "1p", "9p", "1s", "5s"],
    doraIndicators: ["ton"],
  });

  const drew = tsumogiriTimes(state, 4);
  expect(drew.turn).toBe(0);
  const won = Game.apply(drew, 0, { type: "tsumo" });

  const result = winResult(won);
  // 門前ツモ+タンヤオ+ピンフ 3翻20符 = 親ツモ1300点オール
  expect(result.pointDeltas).toEqual([3900, -1300, -1300, -1300]);
  expect(result.pointDeltas.reduce((a, b) => a + b, 0)).toBe(0);
  expect(result.winType).toBe("tsumo");
  expect(result.loser).toBeNull();
});

test("子ツモは親が2倍を支払い他の子は基本額を支払う", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["9m", "1p", "9p", "1s", "7m", "3p", "5s"],
    doraIndicators: ["ton"],
  });

  // 勝者も一巡打牌してから2巡目に和了る(地和にしない)
  const drew = tsumogiriTimes(state, 6);
  expect(drew.turn).toBe(2);
  const won = Game.apply(drew, 2, { type: "tsumo" });

  const result = winResult(won);
  // 門前ツモ+タンヤオ+ピンフ 3翻20符 = 子ツモ700/1300
  expect(result.pointDeltas).toEqual([-1300, -700, 2700, -700]);
  expect(result.pointDeltas.reduce((a, b) => a + b, 0)).toBe(0);
});

test("和了者は場に出ている供託リーチ棒を回収する", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, TANYAO_WAIT, JUNK_C],
    draws: ["ton", "1p", "9m", "9p", "5s"],
    doraIndicators: ["pei"],
  });

  // 親がリーチ(供託1本)し、その後のツモ切り 5s を seat2 がロンする
  const declared = Game.apply(state, 0, { type: "riichi", tile: t("ton") });
  expect(declared.riichiSticks).toBe(1);
  const dealerDraws = tsumogiriTimes(declared, 3);
  const responding = Game.apply(dealerDraws, 0, {
    type: "discard",
    tile: t("5s"),
  });
  const won = Game.apply(responding, 2, { type: "ron" });

  const result = winResult(won);
  // タンヤオ+ピンフ2000点 + 供託1000点。供託分だけ席増減の合計は+1000になる
  expect(result.pointDeltas).toEqual([-2000, 0, 3000, 0]);

  const confirmed = Game.confirmResult(won);
  expect(confirmed.riichiSticks).toBe(0);
  const total = confirmed.players.reduce((sum, p) => sum + p.points, 0);
  expect(total).toBe(100000);
});

test("リーチ宣言牌がロンされるとリーチは不成立になり1000点が戻る", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, TANYAO_WAIT, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["pei"],
  });

  const declared = Game.apply(state, 0, { type: "riichi", tile: t("5s") });
  expect(declared.phase).toBe("response");
  const won = Game.apply(declared, 2, { type: "ron" });

  expect(won.riichiSticks).toBe(0);
  expect(won.players[0].riichi).toBe("none");
  expect(won.players[0].discards.at(-1)?.riichiDeclare).toBe(false);
  expect(winResult(won).pointDeltas).toEqual([-1000, 0, 2000, 0]);

  const confirmed = Game.confirmResult(won);
  expect(confirmed.players[0].points).toBe(23000);
  expect(confirmed.players[2].points).toBe(27000);
});

test("リーチ和了では裏ドラが点数計算に含まれる", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
    draws: ["ton", "1p", "2s", "8p", "nan", "1s", "4p", "9m", "5m"],
    doraIndicators: ["ton"],
    uraIndicators: ["4s"],
  });
  const declared = Game.apply(tsumogiriTimes(state, 4), 0, {
    type: "riichi",
    tile: t("nan"),
  });
  const backToDealer = tsumogiriTimes(declared, 3);

  const won = Game.apply(backToDealer, 0, { type: "tsumo" });

  const result = winResult(won);
  if (!result.score.valid) {
    throw new Error("expected valid score");
  }
  // 裏ドラ表示牌 4s → 裏ドラ 5s。手中の 5s×2 で2翻付く
  const ura = result.score.yaku.find((yaku) => yaku.name === "ura_dora");
  expect(ura).toEqual({ name: "ura_dora", han: 2 });
});

test("リーチしていない和了では裏ドラは付かない", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["ton"],
    uraIndicators: ["7p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5s") });
  const won = Game.apply(responding, 2, { type: "ron" });

  const result = winResult(won);
  if (!result.score.valid) {
    throw new Error("expected valid score");
  }
  expect(result.score.yaku.map((y) => y.name)).not.toContain("ura_dora");
});

test("役のないテンパイではロンの機会が発生しない", () => {
  const yakuless = ["2m", "3m", "4m", "4p", "5p", "6p", "7p", "8p", "9p", "9s", "9s", "4s", "6s"];
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, yakuless, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["ton"],
  });

  const after = Game.apply(state, 0, { type: "discard", tile: t("5s") });

  expect(after.phase).toBe("action");
  expect(after.turn).toBe(1);
  expect(Game.legalActions(after, 2)).toEqual([]);
});

test("赤ドラありでは手中の赤5が赤ドラとして加算される", () => {
  const redHand = ["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "0s", "5s", "6m", "7m"];
  const state = startWithOrder({
    hands: [redHand, JUNK_A, JUNK_B, JUNK_C],
    draws: ["9m", "1p", "2s", "8p", "5m"],
    doraIndicators: ["ton"],
    akaDora: true,
  });

  const drew = tsumogiriTimes(state, 4);
  const won = Game.apply(drew, 0, { type: "tsumo" });

  const result = winResult(won);
  if (!result.score.valid) {
    throw new Error("expected valid score");
  }
  const aka = result.score.yaku.find((yaku) => yaku.name === "aka_dora");
  expect(aka).toEqual({ name: "aka_dora", han: 1 });
});

/** 副露済みでタンヤオしか役がない 2s/5s 待ちの手を seat2 に注入する */
const injectOpenTanyao = (state: GameState): GameState => ({
  ...state,
  players: state.players.map((player) =>
    player.seat === 2
      ? {
          ...player,
          hand: ["2m", "3m", "4m", "4p", "5p", "6p", "8p", "8p", "3s", "4s"].map(
            (notation) => t(notation),
          ),
          melds: [
            {
              meld: { type: "pon", tiles: [t("6s"), t("6s"), t("6s")] },
              calledFrom: 0,
              calledTile: t("6s"),
            },
          ],
        }
      : player,
  ),
});

test("喰いタンなしでは副露したタンヤオのみの手でロンの機会が発生しない", () => {
  const state = startWithOrder(
    {
      hands: [JUNK_A, JUNK_B, JUNK_C, JUNK_C],
      draws: ["5s"],
      doraIndicators: ["ton"],
    },
    { kuitan: false },
  );

  const after = Game.apply(injectOpenTanyao(state), 0, {
    type: "discard",
    tile: t("5s"),
  });

  expect(after.phase).toBe("action");
  expect(after.turn).toBe(1);
});

test("喰いタンありなら副露したタンヤオのみの手でもロンできる", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, JUNK_C, JUNK_C],
    draws: ["5s"],
    doraIndicators: ["ton"],
  });

  const responding = Game.apply(injectOpenTanyao(state), 0, {
    type: "discard",
    tile: t("5s"),
  });

  expect(responding.phase).toBe("response");
  expect(responding.pendingResponders).toContain(2);
});

test("ツモ和了の役には門前ツモが含まれ結果に反映される", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
    draws: ["9m", "1p", "9p", "1s", "7m", "3p", "5s"],
    doraIndicators: ["ton"],
  });
  const drew = tsumogiriTimes(state, 6);

  expect(actionTypes(Game.legalActions(drew, 2))).toContain("tsumo");
  const won = Game.apply(drew, 2, { type: "tsumo" });

  const result = winResult(won);
  if (!result.score.valid) {
    throw new Error("expected valid score");
  }
  expect(result.score.yaku.map((y) => y.name)).toContain("menzen_tsumo");
  expect(result.winner).toBe(2);
});
