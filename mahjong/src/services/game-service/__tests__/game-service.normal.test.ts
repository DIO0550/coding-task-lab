import { expect, test } from "vitest";
import { GameService } from "../index.ts";
import type { RuleConfig, PlayerConfig } from "../../../types/game.ts";

test("ゲーム開始時に配牌が行われ、プレイヤー4人の手牌と卓情報が正しく初期化される", () => {
  const rules: RuleConfig = {
    length: "hanchan",
    initialScore: 25000,
    returnScore: 30000,
    kuiTan: true,
    atoZuke: true,
    akaDora: true,
    cpuAutoWin: true,
  };

  const playerConfigs: PlayerConfig[] = [
    { type: "human", name: "プレイヤー", cpuLevel: "standard" },
    { type: "cpu", name: "CPU 1", cpuLevel: "standard" },
    { type: "cpu", name: "CPU 2", cpuLevel: "standard" },
    { type: "cpu", name: "CPU 3", cpuLevel: "standard" },
  ];

  const init = GameService.createInitialState(rules, playerConfigs);
  const started = GameService.startMatch(init);

  expect(started.phase).toBe("turn_discard");
  // Dealer (player 0) drew 14th tile
  expect(started.players[0].hand.length).toBe(14);
  // Other players have 13 tiles
  expect(started.players[1].hand.length).toBe(13);
  expect(started.players[2].hand.length).toBe(13);
  expect(started.players[3].hand.length).toBe(13);
  // Total dealt tiles = 14 + 13*3 = 53 tiles. Wall remaining: 136 - 14(dead wall) - 53 = 69
  expect(started.table.wall.length).toBe(69);
  expect(started.table.doraIndicators.length).toBe(1);
});

test("ツモから打牌で手番が移動する", () => {
  const rules: RuleConfig = {
    length: "hanchan",
    initialScore: 25000,
    returnScore: 30000,
    kuiTan: true,
    atoZuke: true,
    akaDora: true,
    cpuAutoWin: true,
  };

  const playerConfigs: PlayerConfig[] = [
    { type: "human", name: "プレイヤー", cpuLevel: "standard" },
    { type: "cpu", name: "CPU 1", cpuLevel: "standard" },
    { type: "cpu", name: "CPU 2", cpuLevel: "standard" },
    { type: "cpu", name: "CPU 3", cpuLevel: "standard" },
  ];

  const init = GameService.createInitialState(rules, playerConfigs);
  const started = GameService.startMatch(init);

  const discardTile = started.players[0].hand[0];
  const afterDiscard = GameService.handleDiscard(started, 0, discardTile);

  // Turn moves to player 1 (CPU 1) and draws
  expect(afterDiscard.table.currentTurnIndex).toBe(1);
  expect(afterDiscard.players[1].hand.length).toBe(14);
});
