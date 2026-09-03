import { test, expect } from "vitest";

import { PlayerConfig } from "@/src/domains/player-config";
import { RoundState } from "@/src/domains/round-state";
import { RuleConfig } from "@/src/domains/rule-config";
import { Wall } from "@/src/domains/wall";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { GameState } from "..";

const game = (scores: readonly number[], rules = RuleConfig.default(), roundWind: "ton" | "nan" = "ton", roundNumber = 1): GameState => ({
  players: PlayerConfig.defaults(),
  rules,
  scores,
  round: RoundState.create({ roundWind, roundNumber, honba: 0, kyotaku: 0, dealer: 0, wall: Wall.create(createSeededRandom(1), true) }),
  status: "playing",
  history: [],
});

test("順位は持ち点順で、同点なら起家に近い席が上位になる", () => {
  const ranking = GameState.ranking(game([25000, 30000, 30000, 15000]));
  expect(ranking.map((entry) => [entry.seat, entry.rank])).toStrictEqual([
    [1, 1],
    [2, 2],
    [0, 3],
    [3, 4],
  ]);
});

test("最終ポイントは返し点との差にオカを1位へ加えたもの", () => {
  const ranking = GameState.ranking(game([40000, 25000, 20000, 15000]));
  expect(ranking.map((entry) => entry.points)).toStrictEqual([30, -5, -10, -15]);
});

test("持ち点が0点未満の席があればトビ", () => {
  expect(GameState.isTobi(game([25000, 25000, 25000, -100]))).toBe(true);
  expect(GameState.isTobi(game([25000, 25000, 25000, 0]))).toBe(false);
});

test("半荘戦の南4局と東風戦の東4局は最終局になる", () => {
  expect(GameState.isLastRound(game([0, 0, 0, 0], RuleConfig.default(), "nan", 4))).toBe(true);
  expect(GameState.isLastRound(game([0, 0, 0, 0], RuleConfig.default(), "ton", 4))).toBe(false);
  const tonpuu = RuleConfig.with(RuleConfig.default(), { gameLength: "tonpuu" });
  expect(GameState.isLastRound(game([0, 0, 0, 0], tonpuu, "ton", 4))).toBe(true);
});

test("点数移動を席ごとに反映できる", () => {
  const applied = GameState.applyDeltas(game([25000, 25000, 25000, 25000]), [-1300, 0, 0, 1300]);
  expect(applied.scores).toStrictEqual([23700, 25000, 25000, 26300]);
});

test("人間と CPU の席を判定できる", () => {
  const state = game([25000, 25000, 25000, 25000]);
  expect(GameState.isHuman(state, 0)).toBe(true);
  expect(GameState.isCpu(state, 1)).toBe(true);
});
