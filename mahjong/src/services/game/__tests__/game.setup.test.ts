import { test, expect } from "vitest";

import { Tile } from "@/src/domains/tile";
import { Game } from "../index";
import { seededRng, testConfig } from "./helpers";

test("対局開始時に各家へ13枚が配牌される", () => {
  const state = Game.create(testConfig(), seededRng(1));
  for (const player of state.players) {
    expect(player.hand).toHaveLength(13);
  }
});

test("対局開始時の残り山は70枚で、親が第1ツモを持って手番になる", () => {
  const state = Game.create(testConfig(), seededRng(2));
  // 136 - 王牌14 - 配牌52 = 70。親が1枚ツモ済みのため残りは69
  expect(state.wallCount).toBe(69);
  expect(state.players[0].drawn).not.toBeNull();
  expect(state.phase).toStrictEqual({ type: "turn", actor: 0 });
});

test("対局は東1局0本場・供託0・席0が親で始まる", () => {
  const state = Game.create(testConfig(), seededRng(3));
  expect(state.round).toStrictEqual({
    wind: "ton",
    kyoku: 1,
    honba: 0,
    kyotaku: 0,
  });
  expect(state.dealer).toBe(0);
});

test("全員が設定した持ち点で開始する", () => {
  const state = Game.create(testConfig({ startingPoints: 30000 }), seededRng(4));
  for (const player of state.players) {
    expect(player.points).toBe(30000);
  }
});

test("開局時にドラ表示牌が1枚めくられている", () => {
  const state = Game.create(testConfig(), seededRng(5));
  expect(state.doraIndicators).toHaveLength(1);
});

test("赤ドラありでは0m/0p/0sが牌山全体に各1枚含まれる", () => {
  const state = Game.create(testConfig({ akaDora: true }), seededRng(6));
  const all = [
    ...state.players.flatMap((player) => player.hand),
    ...(state.players[0].drawn === null ? [] : [state.players[0].drawn]),
    ...state.wall.live,
    ...state.wall.dead,
  ];
  expect(all).toHaveLength(136);
  expect(all.filter((tile) => tile === "0m")).toHaveLength(1);
  expect(all.filter((tile) => tile === "0p")).toHaveLength(1);
  expect(all.filter((tile) => tile === "0s")).toHaveLength(1);
});

test("赤ドラなしでは赤5が一切含まれない", () => {
  const state = Game.create(testConfig({ akaDora: false }), seededRng(7));
  const all = [
    ...state.players.flatMap((player) => player.hand),
    ...state.wall.live,
    ...state.wall.dead,
  ];
  expect(all.some(Tile.isRed)).toBe(false);
});
