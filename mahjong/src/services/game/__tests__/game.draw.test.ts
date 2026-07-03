import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import { Game } from "../index";
import { junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(500);

/** 123456789m + 2s2s + 5p5p: シャンポン待ちのテンパイ形 */
const tenpaiHand: readonly Tile[] = [
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

/** 席0が最終打牌をして荒牌流局になる局面を作る(席1のテンパイは指定可能) */
const setupLastDiscard = (spec: {
  dealerHand?: readonly Tile[];
  secondHand?: readonly Tile[];
}) =>
  setupState({
    players: [
      { hand: spec.dealerHand ?? junkHand, drawn: "9p" },
      { hand: spec.secondHand ?? junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: [],
    phase: { type: "turn", actor: 0 },
  });

test("山が尽きると荒牌流局になりテンパイ者へノーテン罰符が移動する", () => {
  const state = setupLastDiscard({ secondHand: tenpaiHand });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9p", riichi: false },
    rng,
  );
  expect(next.phase.type).toBe("roundEnd");
  if (next.phase.type !== "roundEnd" || next.phase.result.type !== "draw") {
    throw new Error("流局になっていない");
  }
  expect(next.phase.result.tenpai).toStrictEqual([false, true, false, false]);
  expect(next.phase.result.pointDeltas).toStrictEqual([
    -1000, 3000, -1000, -1000,
  ]);
  expect(next.phase.result.dealerKeeps).toBe(false);
});

test("全員ノーテンの流局では点数移動がない", () => {
  const state = setupLastDiscard({});
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9p", riichi: false },
    rng,
  );
  if (next.phase.type !== "roundEnd" || next.phase.result.type !== "draw") {
    throw new Error("流局になっていない");
  }
  expect(next.phase.result.pointDeltas).toStrictEqual([0, 0, 0, 0]);
});

test("テンパイ2人の流局では1500点ずつ移動する", () => {
  const otherTenpai: readonly Tile[] = [
    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "6p",
    "7p",
    "8p",
    "9p",
    "3s",
    "3s",
    "8m",
    "8m",
  ];
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "9s" },
      { hand: tenpaiHand },
      { hand: otherTenpai },
      { hand: junkHand },
    ],
    live: [],
    phase: { type: "turn", actor: 0 },
  });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9s", riichi: false },
    rng,
  );
  if (next.phase.type !== "roundEnd" || next.phase.result.type !== "draw") {
    throw new Error("流局になっていない");
  }
  expect(next.phase.result.pointDeltas).toStrictEqual([
    -1500, 1500, 1500, -1500,
  ]);
});

test("親がノーテンの流局を確定すると輪荘して本場が1増える", () => {
  const state = setupLastDiscard({ secondHand: tenpaiHand });
  const roundEnd = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9p", riichi: false },
    rng,
  );
  const confirmed = Game.apply(roundEnd, { type: "confirmRoundEnd" }, rng);
  expect(confirmed.dealer).toBe(1);
  expect(confirmed.round.kyoku).toBe(2);
  expect(confirmed.round.honba).toBe(1);
  expect(confirmed.players[1].points).toBe(28000);
});

test("親がテンパイの流局を確定すると連荘して本場が1増える", () => {
  const dealerTenpai: readonly Tile[] = [...tenpaiHand];
  const state = setupLastDiscard({ dealerHand: dealerTenpai });
  const roundEnd = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9p", riichi: false },
    rng,
  );
  if (roundEnd.phase.type !== "roundEnd" || roundEnd.phase.result.type !== "draw") {
    throw new Error("流局になっていない");
  }
  expect(roundEnd.phase.result.dealerKeeps).toBe(true);
  const confirmed = Game.apply(roundEnd, { type: "confirmRoundEnd" }, rng);
  expect(confirmed.dealer).toBe(0);
  expect(confirmed.round.kyoku).toBe(1);
  expect(confirmed.round.honba).toBe(1);
});

test("流局では供託が次局へ持ち越される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "9p" },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: [],
    round: { kyotaku: 2 },
    phase: { type: "turn", actor: 0 },
  });
  const roundEnd = Game.apply(
    state,
    { type: "discard", player: 0, tile: "9p", riichi: false },
    rng,
  );
  const confirmed = Game.apply(roundEnd, { type: "confirmRoundEnd" }, rng);
  expect(confirmed.round.kyotaku).toBe(2);
});
