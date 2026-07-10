import { test, expect } from "vitest";

import { LIVE_WALL_SIZE } from "../../../domains/game/index.ts";
import { GameEngine } from "../index.ts";
import { createTestMatch, defaultConfig } from "./support.ts";

test("配牌直後(親の第一ツモ完了後)は親が14枚・子が13枚、残り山はツモ可能70枚から1枚引いた69枚、ドラ表示牌1枚になる", () => {
  const state = createTestMatch();

  const dealerView = GameEngine.viewFor(state, 0);
  expect(dealerView.hand.length).toBe(13);
  expect(dealerView.drawnTile).not.toBeNull();
  expect(dealerView.players[1].handCount).toBe(13);
  expect(dealerView.players[2].handCount).toBe(13);
  expect(dealerView.players[3].handCount).toBe(13);
  expect(dealerView.remainingWallCount).toBe(LIVE_WALL_SIZE - 1);
  expect(dealerView.doraIndicators.length).toBe(1);
  expect(dealerView.phase).toBe("turn");
  expect(dealerView.kyokuNumber).toBe(1);
  expect(dealerView.roundWind).toBe("ton");
  expect(dealerView.honba).toBe(0);
  expect(dealerView.kyotaku).toBe(0);
  expect(dealerView.dealerSeat).toBe(0);
});

test("createMatchはGameEngine.createMatchでも同じ形の状態(69枚残り・ドラ表示牌1枚)になる", () => {
  const state = GameEngine.createMatch(defaultConfig(), () => 0.42);
  const view = GameEngine.viewFor(state, state.dealerSeat);
  expect(view.remainingWallCount).toBe(LIVE_WALL_SIZE - 1);
  expect(view.doraIndicators.length).toBe(1);
  expect(view.players.every((p) => p.score === defaultConfig().rules.startingPoints)).toBe(true);
});
