import { test, expect } from "vitest";

import { Game } from "../index";
import { discardEntry, junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(100);

/** 誰も鳴けない打牌で手番が移る局面(席0がツモ済み) */
const setupSimpleTurn = () =>
  setupState({
    players: [
      { hand: junkHand, drawn: "9s" },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m", "2s"],
    phase: { type: "turn", actor: 0 },
  });

test("打牌すると誰も鳴けなければ手番が下家へ移り下家がツモる", () => {
  const state = setupSimpleTurn();
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9s", riichi: false },
    rng,
  );
  expect(next.phase).toStrictEqual({ type: "turn", actor: 1 });
  expect(next.players[1].drawn).toBe("3p");
  expect(next.wallCount).toBe(state.wallCount - 1);
});

test("ツモ切りした牌は河にツモ切りフラグ付きで追加される", () => {
  const state = setupSimpleTurn();
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9s", riichi: false },
    rng,
  );
  expect(next.players[0].discards).toStrictEqual([
    { tile: "9s", riichi: false, claimed: false, tsumogiri: true },
  ]);
  expect(next.players[0].drawn).toBeNull();
});

test("手出しするとツモ牌が手牌に加わり手牌は13枚のまま保たれる", () => {
  const state = setupSimpleTurn();
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "1m", riichi: false },
    rng,
  );
  expect(next.players[0].hand).toHaveLength(13);
  expect(next.players[0].hand).toContain("9s");
  expect(next.players[0].discards[0]).toStrictEqual({
    tile: "1m",
    riichi: false,
    claimed: false,
    tsumogiri: false,
  });
});

test("手牌にない牌の打牌は無視され状態が変わらない", () => {
  const state = setupSimpleTurn();
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  expect(next).toBe(state);
});

test("手番でないプレイヤーの打牌は無視される", () => {
  const state = setupSimpleTurn();
  const next = Game.apply(
    state,
    { type: "discard", player: 1, tile: "1m", riichi: false },
    rng,
  );
  expect(next).toBe(state);
});

test("鳴き直後の手番ではツモ・リーチ・カンはできず打牌のみ選べる", () => {
  const state = setupState({
    players: [
      { hand: junkHand },
      {
        hand: ["2m", "3m", "4m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan"],
        melds: [
          { meld: { type: "pon", tiles: ["5m", "5m", "5m"] }, from: 0 },
        ],
        discards: [discardEntry("8s")],
      },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p"],
    phase: { type: "turn", actor: 1 },
  });
  const actions = Game.availableTurnActions(state);
  expect(actions).not.toBeNull();
  expect(actions?.canTsumo).toBe(false);
  expect(actions?.canRiichi).toBe(false);
  expect(actions?.ankanTiles).toStrictEqual([]);
  expect(actions?.kakanTiles).toStrictEqual([]);
  expect(actions?.discards).toHaveLength(11);
});

test("turnフェーズ以外ではavailableTurnActionsはnullを返す", () => {
  const state = setupState({
    players: [
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    phase: {
      type: "roundEnd",
      result: {
        type: "draw",
        tenpai: [false, false, false, false],
        pointDeltas: [0, 0, 0, 0],
        dealerKeeps: false,
      },
    },
  });
  expect(Game.availableTurnActions(state)).toBeNull();
});
