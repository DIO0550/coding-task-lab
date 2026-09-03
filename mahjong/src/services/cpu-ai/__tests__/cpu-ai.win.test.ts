import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";
import { PlayerConfig, type CpuLevel } from "@/src/domains/player-config";
import { RuleConfig } from "@/src/domains/rule-config";
import { TableView } from "@/src/domains/table-view";
import type { Tile } from "@/src/domains/tile";
import { GameEngine } from "@/src/services/game-engine";
import { discard, startGame } from "@/src/services/game-engine/__tests__/fixtures";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { CpuAi } from "..";

/** 断么九の 3p/6p 待ち */
const TANYAO: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];

const rng = () => createSeededRandom(1);

test.each(["beginner", "standard", "advanced"] as const)("%s の CPU は和了形をツモると必ずツモ和了を宣言する", (level: CpuLevel) => {
  const players = [PlayerConfig.cpu("CPU 0", level), PlayerConfig.human("P1"), PlayerConfig.human("P2"), PlayerConfig.human("P3")];
  const game = startGame({ hands: [TANYAO, null, null, null], draws: ["3p"], doraIndicators: ["ton"], players });
  const decided = CpuAi.decide(TableView.from(game, 0), GameEngine.availableActions(game, 0), level, game.rules, rng());
  expect(decided).toStrictEqual(PlayerAction.tsumo());
  const advanced = GameEngine.advanceCpu(game, rng());
  expect(advanced.round.phase).toMatchObject({ type: "ended", result: { type: "win", winner: 0, winType: "tsumo" } });
});

test.each(["beginner", "standard", "advanced"] as const)("%s の CPU は他家の打牌で和了できればロンを宣言する", (level: CpuLevel) => {
  const players = [PlayerConfig.human("P0"), PlayerConfig.human("P1"), PlayerConfig.human("P2"), PlayerConfig.cpu("CPU 3", level)];
  const game = discard(startGame({ hands: [null, null, null, TANYAO], draws: ["3p"], doraIndicators: ["ton"], players }), 0, "3p");
  expect(GameEngine.hasPendingCpu(game)).toBe(true);
  const advanced = GameEngine.advanceCpu(game, rng());
  expect(advanced.round.phase).toMatchObject({ type: "ended", result: { type: "win", winner: 3, loser: 0, winType: "ron" } });
});

test("CPU自動和了なしの設定でも初期実装では和了を宣言する", () => {
  const game = startGame({ hands: [TANYAO, null, null, null], draws: ["3p"], doraIndicators: ["ton"], rules: { cpuAutoWin: false } });
  const rules = RuleConfig.with(game.rules, { cpuAutoWin: false });
  const decided = CpuAi.decide(TableView.from(game, 0), GameEngine.availableActions(game, 0), "standard", rules, rng());
  expect(decided.type).toBe("tsumo");
});

test("CPU の判断に渡される卓情報には他家の手牌も牌山も含まれない", () => {
  const game = startGame({ hands: [TANYAO, null, null, null], draws: ["3p"] });
  const view = TableView.from(game, 0);
  expect(Object.keys(view)).not.toContain("wall");
  expect(view.seats.every((seat) => !("hand" in seat) && !("drawnTile" in seat))).toBe(true);
  expect(view.hand).toStrictEqual(game.round.seats[0].hand);
});
