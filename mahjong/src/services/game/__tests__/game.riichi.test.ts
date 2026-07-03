import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import { Game, type DiscardEntry } from "../index";
import { discardEntry, junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(200);

/** 123456789m + 2s2s + 5p5p でテンパイ、9s をツモった局面 */
const riichiReadyHand: readonly Tile[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "2s",
  "2s",
  "5p",
  "5p",
];

const setupRiichiTurn = (
  overrides: Partial<{
    points: number;
    live: readonly Tile[];
    interrupted: boolean;
    discards: readonly DiscardEntry[];
  }> = {},
) =>
  setupState({
    players: [
      {
        hand: riichiReadyHand,
        drawn: "9s",
        points: overrides.points ?? 25000,
        discards: overrides.discards ?? [discardEntry("1s")],
      },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: overrides.live ?? ["3p", "6m", "2m", "8p", "4s"],
    phase: { type: "turn", actor: 0 },
    interrupted: overrides.interrupted ?? true,
  });

test("テンパイを維持する打牌だけがリーチ宣言の候補になる", () => {
  const state = setupRiichiTurn();
  const actions = Game.availableTurnActions(state);
  expect(actions?.canRiichi).toBe(true);
  expect(actions?.riichiDiscards).toStrictEqual(["9s"]);
});

test("リーチ宣言すると持ち点が1000減り供託が1増える", () => {
  const state = setupRiichiTurn();
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9s", riichi: true },
    rng,
  );
  expect(next.players[0].points).toBe(24000);
  expect(next.round.kyotaku).toBe(1);
  expect(next.players[0].riichi).toBe("riichi");
  expect(next.players[0].riichiTileIndex).toBe(1);
  expect(next.players[0].ippatsu).toBe(true);
  expect(next.players[0].discards[1]).toStrictEqual({
    tile: "9s",
    riichi: true,
    claimed: false,
    tsumogiri: true,
  });
});

test("持ち点が1000未満だとリーチできない", () => {
  const state = setupRiichiTurn({ points: 900 });
  const actions = Game.availableTurnActions(state);
  expect(actions?.canRiichi).toBe(false);
  expect(actions?.riichiDiscards).toStrictEqual([]);
});

test("残り山が4枚未満だとリーチできない", () => {
  const state = setupRiichiTurn({ live: ["3p", "6m", "2m"] });
  const actions = Game.availableTurnActions(state);
  expect(actions?.canRiichi).toBe(false);
});

test("鳴きの入らない最初の打牌でのリーチはダブルリーチになる", () => {
  const state = setupRiichiTurn({ interrupted: false, discards: [] });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9s", riichi: true },
    rng,
  );
  expect(next.players[0].riichi).toBe("double");
});

test("リーチ後の手番ではツモ牌しか打牌できない", () => {
  const state = setupState({
    players: [
      {
        hand: riichiReadyHand,
        drawn: "3p",
        riichi: "riichi",
        riichiTileIndex: 0,
        discards: [discardEntry("9s", { riichi: true })],
      },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["6m", "2m", "8p", "4s"],
    phase: { type: "turn", actor: 0 },
  });
  const actions = Game.availableTurnActions(state);
  expect(actions?.discards).toStrictEqual(["3p"]);
  expect(actions?.canRiichi).toBe(false);
});
