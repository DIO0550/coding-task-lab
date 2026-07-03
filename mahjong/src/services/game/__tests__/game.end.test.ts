import { test, expect } from "vitest";

import { Game, type DrawResult, type WinResult } from "../index";
import { junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(600);

const noMoveDraw = (dealerKeeps: boolean): DrawResult => ({
  type: "draw",
  tenpai: [dealerKeeps, false, false, false],
  pointDeltas: [0, 0, 0, 0],
  dealerKeeps,
});

const winBy = (
  winner: number,
  deltas: readonly number[],
  dealerKeeps: boolean,
): WinResult => ({
  type: "win",
  winner,
  loser: null,
  winType: "tsumo",
  yaku: [{ name: "tanyao", han: 1 }],
  han: 1,
  fu: 40,
  scoreTotal: Math.max(...deltas),
  pointDeltas: deltas,
  uraDora: [],
  dealerKeeps,
});

type Points = readonly [number, number, number, number];

const setupRoundEnd = (spec: {
  result: DrawResult | WinResult;
  wind?: "ton" | "nan";
  kyoku?: 1 | 2 | 3 | 4;
  dealer?: number;
  gameType?: "tonpuu" | "hanchan";
  points?: Points;
  kyotaku?: number;
  returnPoints?: 30000 | null;
}) =>
  setupState({
    players: [
      { hand: junkHand, points: spec.points?.[0] ?? 25000 },
      { hand: junkHand, points: spec.points?.[1] ?? 25000 },
      { hand: junkHand, points: spec.points?.[2] ?? 25000 },
      { hand: junkHand, points: spec.points?.[3] ?? 25000 },
    ],
    dealer: spec.dealer ?? 3,
    round: {
      wind: spec.wind ?? "nan",
      kyoku: spec.kyoku ?? 4,
      kyotaku: spec.kyotaku ?? 0,
    },
    rules: {
      gameType: spec.gameType ?? "hanchan",
      returnPoints: spec.returnPoints === undefined ? 30000 : spec.returnPoints,
    },
    phase: { type: "roundEnd", result: spec.result },
  });

test("半荘戦は南4局の輪荘で終局し順位が付く", () => {
  const state = setupRoundEnd({
    result: winBy(1, [-1000, 2000, -500, -500], false),
    points: [25000, 25000, 25000, 25000],
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  expect(ended.phase.type).toBe("gameEnd");
  if (ended.phase.type !== "gameEnd") {
    throw new Error("終局していない");
  }
  // 席1: 27000 / 席2: 24500 / 席3: 24500(同点は起家に近い方) / 席0: 24000
  expect(ended.phase.result.ranking.map((entry) => entry.player)).toStrictEqual(
    [1, 2, 3, 0],
  );
  expect(ended.phase.result.ranking.map((entry) => entry.rank)).toStrictEqual([
    1, 2, 3, 4,
  ]);
});

test("東風戦は東4局の輪荘で終局する", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(false),
    wind: "ton",
    kyoku: 4,
    gameType: "tonpuu",
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  expect(ended.phase.type).toBe("gameEnd");
});

test("東風戦の東4局でも親が連荘すれば対局は続く", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(true),
    wind: "ton",
    kyoku: 4,
    gameType: "tonpuu",
  });
  const next = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  expect(next.phase.type).toBe("turn");
  expect(next.round).toStrictEqual({
    wind: "ton",
    kyoku: 4,
    honba: 1,
    kyotaku: 0,
  });
  expect(next.dealer).toBe(3);
});

test("半荘戦の東4局の輪荘では南入する", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(false),
    wind: "ton",
    kyoku: 4,
    gameType: "hanchan",
  });
  const next = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  expect(next.phase.type).toBe("turn");
  expect(next.round.wind).toBe("nan");
  expect(next.round.kyoku).toBe(1);
  expect(next.dealer).toBe(0);
});

test("持ち点が0点未満になるとトビで即終局する", () => {
  const state = setupRoundEnd({
    result: winBy(0, [12000, -12000, 0, 0], false),
    wind: "ton",
    kyoku: 1,
    dealer: 0,
    points: [25000, 8000, 25000, 25000],
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  expect(ended.phase.type).toBe("gameEnd");
  if (ended.phase.type !== "gameEnd") {
    throw new Error("終局していない");
  }
  expect(ended.players[1].points).toBe(-4000);
});

test("持ち点0点ちょうどはトビにならない", () => {
  const state = setupRoundEnd({
    result: winBy(0, [8000, -8000, 0, 0], false),
    wind: "ton",
    kyoku: 1,
    dealer: 0,
    points: [25000, 8000, 25000, 25000],
  });
  const next = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  expect(next.phase.type).toBe("turn");
  expect(next.players[1].points).toBe(0);
});

test("同点は起家に近い方が上位になる", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(false),
    points: [25000, 25000, 25000, 25000],
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  if (ended.phase.type !== "gameEnd") {
    throw new Error("終局していない");
  }
  expect(ended.phase.result.ranking.map((entry) => entry.player)).toStrictEqual(
    [0, 1, 2, 3],
  );
});

test("終局時に残っている供託は1位が回収する", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(false),
    points: [30000, 24000, 23000, 21000],
    kyotaku: 2,
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  if (ended.phase.type !== "gameEnd") {
    throw new Error("終局していない");
  }
  expect(ended.phase.result.ranking[0]).toStrictEqual({
    player: 0,
    rank: 1,
    points: 32000,
    settled: 2,
  });
  expect(ended.round.kyotaku).toBe(0);
});

test("返し点ありでは精算点が(持ち点-返し点)/1000で表示される", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(false),
    points: [35000, 28000, 22000, 15000],
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  if (ended.phase.type !== "gameEnd") {
    throw new Error("終局していない");
  }
  expect(
    ended.phase.result.ranking.map((entry) => entry.settled),
  ).toStrictEqual([5, -2, -8, -15]);
});

test("返し点なしでは精算点がnullになる", () => {
  const state = setupRoundEnd({
    result: noMoveDraw(false),
    returnPoints: null,
  });
  const ended = Game.apply(state, { type: "confirmRoundEnd" }, rng);
  if (ended.phase.type !== "gameEnd") {
    throw new Error("終局していない");
  }
  for (const entry of ended.phase.result.ranking) {
    expect(entry.settled).toBeNull();
  }
});
