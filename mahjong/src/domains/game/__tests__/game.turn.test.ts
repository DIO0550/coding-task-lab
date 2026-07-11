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
  tsumogiri,
  tsumogiriTimes,
} from "./helpers.ts";

const JUNK_D = ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];

const junkTable = () => ({
  hands: [JUNK_A, JUNK_B, JUNK_C, JUNK_D] as const,
});

test("ツモ切りで打牌すると手番が下家へ移る", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m", "6p"] });

  const after = tsumogiri(state);

  expect(after.turn).toBe(1);
  expect(after.phase).toBe("action");
  expect(after.players[1].drawn).toEqual(t("6p"));
  expect(Game.currentActor(after)).toBe(1);
});

test("ツモ切りは河にツモ切りとして記録され手牌は変わらない", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m"] });
  const handBefore = state.players[0].hand.map(n);

  const after = tsumogiri(state);

  expect(after.players[0].discards).toHaveLength(1);
  expect(after.players[0].discards[0].tsumogiri).toBe(true);
  expect(n(after.players[0].discards[0].tile)).toBe("5m");
  expect(after.players[0].hand.map(n)).toEqual(handBefore);
  expect(after.players[0].drawn).toBeNull();
});

test("手出しで打牌するとツモ牌が手牌に加わり切った牌が河に並ぶ", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m"] });

  const after = Game.apply(state, 0, { type: "discard", tile: t("pei") });

  expect(after.players[0].discards[0].tsumogiri).toBe(false);
  expect(n(after.players[0].discards[0].tile)).toBe("pei");
  expect(after.players[0].hand).toHaveLength(13);
  expect(after.players[0].hand.map(n)).toContain("5m");
  expect(after.players[0].hand.map(n)).not.toContain("pei");
});

test("打牌のたびに残り山が1枚ずつ減っていく", () => {
  const state = startWithOrder(junkTable());

  const after = tsumogiriTimes(state, 4);

  expect(Game.viewFor(after, 0).wallRemaining).toBe(69 - 4);
  expect(after.turn).toBe(0);
});

test("手番でないプレイヤーの行動は無視され状態が変わらない", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m"] });

  const after = Game.apply(state, 1, { type: "discard", tile: t("2m") });

  expect(after).toBe(state);
});

test("手牌に無い牌は打牌できず状態が変わらない", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m"] });

  const after = Game.apply(state, 0, { type: "discard", tile: t("chun") });

  expect(after).toBe(state);
});

test("手番プレイヤーの合法手には手牌全種の打牌が含まれる", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m"] });

  const actions = Game.legalActions(state, 0);

  const discards = actions.filter((action) => action.type === "discard");
  expect(discards).toHaveLength(14);
  expect(actionTypes(actions)).not.toContain("tsumo");
  expect(actionTypes(actions)).not.toContain("riichi");
});

test("手番以外のプレイヤーの合法手は空になる", () => {
  const state = startWithOrder({ ...junkTable(), draws: ["5m"] });

  expect(Game.legalActions(state, 1)).toEqual([]);
  expect(Game.legalActions(state, 2)).toEqual([]);
});
