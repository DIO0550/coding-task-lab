import { test, expect } from "vitest";

import { Cpu } from "@/src/services/cpu";
import type { Rng } from "@/src/libs/random";
import { Game, type CpuLevel, type GameState } from "../index";
import { seededRng, testConfig } from "./helpers";

const levelOf = (state: GameState, seat: number): CpuLevel =>
  state.config.players[seat].cpuLevel;

/** CPU に1手進めさせる */
const advanceOnce = (state: GameState, rng: Rng): GameState => {
  switch (state.phase.type) {
    case "turn": {
      const actor = state.phase.actor;
      const actions = Game.availableTurnActions(state);
      if (actions === null) {
        throw new Error("turn フェーズで行動が取得できない");
      }
      const view = Game.playerView(state, actor);
      const action = Cpu.decideTurn(view, actions, levelOf(state, actor));
      return Game.apply(state, action, rng);
    }
    case "claims": {
      const phase = state.phase;
      const pending = phase.options.find(
        (option) => phase.responses[option.player] === null,
      );
      if (pending === undefined) {
        throw new Error("未回答の応答者がいない claims フェーズ");
      }
      const view = Game.playerView(state, pending.player);
      const option =
        view.phase.type === "claims" ? view.phase.options[0] : undefined;
      if (option === undefined) {
        throw new Error("応答者のビューに選択肢がない");
      }
      const action = Cpu.decideClaim(
        view,
        option,
        phase.tile,
        levelOf(state, pending.player),
      );
      return Game.apply(state, action, rng);
    }
    case "roundEnd":
      return Game.apply(state, { type: "confirmRoundEnd" }, rng);
    case "gameEnd":
      return state;
  }
};

const totalPoints = (state: GameState): number =>
  state.players.reduce((sum, player) => sum + player.points, 0);

const runGame = (
  gameType: "tonpuu" | "hanchan",
  cpuLevel: CpuLevel,
  seed: number,
  maxSteps: number,
): GameState => {
  const rng = seededRng(seed);
  const config = testConfig({ gameType, akaDora: true });
  const players = config.players.map((player) => ({ ...player, cpuLevel }));
  let state = Game.create(
    {
      ...config,
      players: [players[0], players[1], players[2], players[3]],
    },
    rng,
  );
  for (let step = 0; step < maxSteps; step += 1) {
    if (state.phase.type === "gameEnd") {
      return state;
    }
    const next = advanceOnce(state, rng);
    if (next === state) {
      throw new Error(
        `CPU の行動が受理されず進行が止まった (step=${step}, phase=${state.phase.type})`,
      );
    }
    // 保存則: 持ち点の合計 + 供託×1000 は常に開始点の合計と一致する
    const conserved = totalPoints(next) + next.round.kyotaku * 1000;
    if (conserved !== next.config.rules.startingPoints * 4) {
      throw new Error(
        `点数の保存則が破れた (step=${step}, total=${conserved})`,
      );
    }
    state = next;
  }
  throw new Error("上限手数までに終局しなかった");
};

test("入門CPU4人の半荘戦が終局まで進行し持ち点が保存される", () => {
  const state = runGame("hanchan", "beginner", 1, 20000);
  expect(state.phase.type).toBe("gameEnd");
  expect(totalPoints(state)).toBe(100000);
  if (state.phase.type === "gameEnd") {
    expect(
      [...state.phase.result.ranking].map((entry) => entry.rank),
    ).toStrictEqual([1, 2, 3, 4]);
    const players = state.phase.result.ranking.map((entry) => entry.player);
    expect([...players].sort()).toStrictEqual([0, 1, 2, 3]);
  }
}, 60000);

test("標準CPU4人の東風戦が終局まで進行する", () => {
  const state = runGame("tonpuu", "standard", 2, 20000);
  expect(state.phase.type).toBe("gameEnd");
  expect(totalPoints(state)).toBe(100000);
}, 60000);

test("上級CPU4人の東風戦が終局まで進行する", () => {
  const state = runGame("tonpuu", "advanced", 3, 20000);
  expect(state.phase.type).toBe("gameEnd");
  expect(totalPoints(state)).toBe(100000);
}, 60000);
