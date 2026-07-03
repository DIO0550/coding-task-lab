import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import { Game } from "../index";
import { discardEntry, junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(700);

test("暗槓すると新ドラがめくれ嶺上牌をツモり残り山が1減る", () => {
  const state = setupState({
    players: [
      {
        hand: ["6s", "6s", "6s", "1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "ton", "nan"],
        drawn: "6s",
        discards: [discardEntry("9p")],
      },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m", "2s"],
    phase: { type: "turn", actor: 0 },
  });
  const actions = Game.availableTurnActions(state);
  expect(actions?.ankanTiles).toStrictEqual(["6s"]);
  const next = Game.apply(state, { type: "ankan", player: 0, tile: "6s" }, rng);
  expect(next.players[0].melds).toStrictEqual([
    { meld: { type: "ankan", tiles: ["6s", "6s", "6s", "6s"] }, from: null },
  ]);
  expect(next.players[0].hand).toHaveLength(10);
  // 嶺上牌(王牌の1枚目 = helpers の inertDeadWall では 1m)をツモる
  expect(next.players[0].drawn).toBe("1m");
  expect(next.doraIndicators).toHaveLength(2);
  expect(next.wallCount).toBe(state.wallCount - 1);
  expect(next.rinshan).toBe(true);
  expect(next.phase).toStrictEqual({ type: "turn", actor: 0 });
});

test("残り山が0枚だとカンできない", () => {
  const state = setupState({
    players: [
      {
        hand: ["6s", "6s", "6s", "1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "ton", "nan"],
        drawn: "6s",
      },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: [],
    phase: { type: "turn", actor: 0 },
  });
  expect(Game.availableTurnActions(state)?.ankanTiles).toStrictEqual([]);
});

/** 123456789m + 4p6p + 2s2s: 5p 待ち。加槓への槍槓検証用 */
const chankanHand: readonly Tile[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "4p",
  "6p",
  "2s",
  "2s",
];

const setupKakan = () =>
  setupState({
    players: [
      {
        hand: ["5p", "9m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan"],
        drawn: "3s",
        melds: [{ meld: { type: "pon", tiles: ["5p", "5p", "5p"] }, from: 3 }],
        discards: [discardEntry("9p")],
      },
      { hand: junkHand },
      { hand: chankanHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m", "2s"],
    phase: { type: "turn", actor: 0 },
  });

test("加槓に対して槍槓のロンが提示され、和了すると槍槓の役が付く", () => {
  const state = setupKakan();
  const actions = Game.availableTurnActions(state);
  expect(actions?.kakanTiles).toStrictEqual(["5p"]);
  const claims = Game.apply(state, { type: "kakan", player: 0, tile: "5p" }, rng);
  expect(claims.phase.type).toBe("claims");
  if (claims.phase.type !== "claims") {
    throw new Error("槍槓の応答待ちになっていない");
  }
  expect(claims.phase.source).toBe("kakan");
  expect(claims.phase.options).toStrictEqual([
    { player: 2, canRon: true, canPon: false, canKan: false, chiOptions: [] },
  ]);
  const resolved = Game.apply(claims, { type: "ron", player: 2 }, rng);
  if (resolved.phase.type !== "roundEnd" || resolved.phase.result.type !== "win") {
    throw new Error("和了になっていない");
  }
  expect(resolved.phase.result.winner).toBe(2);
  expect(resolved.phase.result.loser).toBe(0);
  expect(
    resolved.phase.result.yaku.map((entry) => entry.name),
  ).toContain("chankan");
});

test("槍槓が見逃されるとカンが完成して嶺上牌をツモり、見逃した席はフリテンになる", () => {
  const state = setupKakan();
  const claims = Game.apply(state, { type: "kakan", player: 0, tile: "5p" }, rng);
  const resolved = Game.apply(claims, { type: "pass", player: 2 }, rng);
  expect(resolved.players[0].melds).toStrictEqual([
    { meld: { type: "kan", tiles: ["5p", "5p", "5p", "5p"] }, from: 3 },
  ]);
  expect(resolved.players[0].drawn).toBe("1m");
  expect(resolved.rinshan).toBe(true);
  expect(resolved.doraIndicators).toHaveLength(2);
  expect(resolved.phase).toStrictEqual({ type: "turn", actor: 0 });
  expect(resolved.players[2].furiten).toBe(true);
});

test("大明カンすると嶺上牌をツモってから打牌の手番になる", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "6s" },
      { hand: junkHand },
      {
        hand: ["6s", "6s", "6s", "9m", "1p", "4p", "7p", "1s", "4s", "ton", "nan", "sha", "pei"],
      },
      { hand: junkHand },
    ],
    live: ["3p", "6m", "2s"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "6s", riichi: false },
    rng,
  );
  expect(claims.phase.type).toBe("claims");
  const resolved = Game.apply(claims, { type: "kan", player: 2 }, rng);
  expect(resolved.players[2].melds).toStrictEqual([
    { meld: { type: "kan", tiles: ["6s", "6s", "6s", "6s"] }, from: 0 },
  ]);
  expect(resolved.players[2].hand).toHaveLength(10);
  expect(resolved.players[2].drawn).toBe("1m");
  expect(resolved.rinshan).toBe(true);
  expect(resolved.doraIndicators).toHaveLength(2);
  expect(resolved.phase).toStrictEqual({ type: "turn", actor: 2 });
});
