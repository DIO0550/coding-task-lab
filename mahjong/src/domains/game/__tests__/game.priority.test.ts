import { test, expect } from "vitest";

import { Game } from "../index.ts";
import { JUNK_A, JUNK_B, actionTypes, startWithOrder, t } from "./helpers.ts";

/** 2s/5s 待ちのタンヤオ確定テンパイ(234m 456p 678s 88p + 34s) */
const TANYAO_WAIT_5S = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8p", "8p", "3s", "4s"];
/** 同型で牌が重ならないテンパイ(234m 456p 678s 22p + 34s) */
const TANYAO_WAIT_5S_ALT = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2p", "2p", "3s", "4s"];

test("同一打牌への宣言はロンがポンより優先される", () => {
  const ponHand = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "5s", "5s", "haku", "hatsu", "chun", "ton"];
  const state = startWithOrder({
    hands: [JUNK_A, ponHand, TANYAO_WAIT_5S, JUNK_B.toReversed()],
    draws: ["5s"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5s") });
  expect(responding.pendingResponders).toEqual([1, 2]);
  expect(Game.currentActor(responding)).toBe(1);
  expect(actionTypes(Game.legalActions(responding, 1))).toContain("pon");
  expect(actionTypes(Game.legalActions(responding, 2))).toContain("ron");

  const declared = Game.apply(responding, 1, {
    type: "pon",
    tiles: [t("5s"), t("5s")],
  });
  const resolved = Game.apply(declared, 2, { type: "ron" });

  expect(resolved.phase).toBe("result_win");
  expect(resolved.result).toMatchObject({
    kind: "win",
    winner: 2,
    loser: 0,
    winType: "ron",
  });
  expect(resolved.players[1].melds).toHaveLength(0);
});

test("同一打牌への宣言はポンがチーより優先される", () => {
  const chiHand = ["2m", "5m", "8m", "3p", "4p", "9p", "1s", "4s", "7s", "haku", "hatsu", "chun", "ton"];
  const ponHand = ["3m", "6m", "9m", "1p", "7p", "9s", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const state = startWithOrder({
    hands: [JUNK_A, chiHand, ponHand, JUNK_B.toReversed()],
    draws: ["5p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  expect(responding.pendingResponders).toEqual([1, 2]);

  const declared = Game.apply(responding, 1, {
    type: "chi",
    tiles: [t("3p"), t("4p")],
  });
  const resolved = Game.apply(declared, 2, {
    type: "pon",
    tiles: [t("5p"), t("5p")],
  });

  expect(resolved.phase).toBe("action");
  expect(resolved.turn).toBe(2);
  expect(resolved.players[2].melds[0].meld.type).toBe("pon");
  expect(resolved.players[1].melds).toHaveLength(0);
});

test("複数のロン宣言は打牌者から見て回り順が早い席が和了する(頭跳ね)", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, TANYAO_WAIT_5S, TANYAO_WAIT_5S_ALT],
    draws: ["5s"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5s") });
  expect(responding.pendingResponders).toEqual([2, 3]);

  const declared = Game.apply(responding, 3, { type: "ron" });
  const resolved = Game.apply(declared, 2, { type: "ron" });

  expect(resolved.phase).toBe("result_win");
  expect(resolved.result).toMatchObject({ kind: "win", winner: 2, loser: 0 });
});

test("全員がパスすると打牌は流れて下家の手番になる", () => {
  const ponHand = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "5s", "5s", "haku", "hatsu", "chun", "ton"];
  const state = startWithOrder({
    hands: [JUNK_A, ponHand, TANYAO_WAIT_5S, JUNK_B.toReversed()],
    draws: ["5s", "9p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5s") });
  const onePassed = Game.apply(responding, 1, { type: "pass" });
  expect(onePassed.phase).toBe("response");

  const allPassed = Game.apply(onePassed, 2, { type: "pass" });

  expect(allPassed.phase).toBe("action");
  expect(allPassed.turn).toBe(1);
  expect(allPassed.players[1].melds).toHaveLength(0);
});
