import { test, expect } from "vitest";

import type { GameState } from "@/src/domains/game-state";
import { PlayerConfig } from "@/src/domains/player-config";
import { RuleConfig } from "@/src/domains/rule-config";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { GameEngine } from "..";
import { stepCpu } from "./fixtures";

const cpuPlayers = () => [
  PlayerConfig.cpu("A", "beginner"),
  PlayerConfig.cpu("B", "standard"),
  PlayerConfig.cpu("C", "advanced"),
  PlayerConfig.cpu("D", "standard"),
];

/** CPU だけで終局まで進める(局が終わるたびに結果を確定する) */
const playToEnd = (rules: RuleConfig, seed: number) => {
  const rng = createSeededRandom(seed);
  const start = GameEngine.start({ players: cpuPlayers(), rules }, rng);
  return Array.from({ length: 5000 }).reduce<GameState>((game) => stepCpu(game, rng), start);
};

test("CPU 4人の東風戦は自動で終局し、最終順位が決まる", () => {
  const finished = playToEnd(RuleConfig.with(RuleConfig.default(), { gameLength: "tonpuu" }), 11);
  expect(finished.status).toBe("finished");
  expect(finished.history.length).toBeGreaterThanOrEqual(4);
  expect(GameEngine.ranking(finished).map((entry) => entry.rank)).toStrictEqual([1, 2, 3, 4]);
});

test("対局を通して4人の持ち点の合計は供託分を除いて一定に保たれる", () => {
  const finished = playToEnd(RuleConfig.with(RuleConfig.default(), { gameLength: "tonpuu" }), 23);
  const total = finished.scores.reduce((sum, score) => sum + score, 0);
  expect(total + finished.round.kyotaku * 1000).toBe(100000);
});

test("CPU 4人の半荘戦も自動で終局する", () => {
  const finished = playToEnd(RuleConfig.default(), 37);
  expect(finished.status).toBe("finished");
  expect(GameEngine.pendingSeats(finished)).toStrictEqual([]);
});
