import { test, expect } from "vitest";

import type { CpuLevel, MatchConfig, SeatIndex } from "../../../domains/game/index.ts";
import type { Rng } from "../../../types/rng.ts";
import { GameEngine } from "../../game-engine/index.ts";
import { CpuAi } from "../index.ts";

/** テスト用の決定的PRNG(mulberry32)。Math.randomは使わない。 */
const makeRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const configFor = (levels: readonly [CpuLevel, CpuLevel, CpuLevel, CpuLevel]): MatchConfig => ({
  players: [
    { kind: "cpu", name: "CPU0", cpuLevel: levels[0] },
    { kind: "cpu", name: "CPU1", cpuLevel: levels[1] },
    { kind: "cpu", name: "CPU2", cpuLevel: levels[2] },
    { kind: "cpu", name: "CPU3", cpuLevel: levels[3] },
  ],
  rules: {
    matchType: "tonpuu",
    startingPoints: 25000,
    returnPoints: 30000,
    kuitan: true,
    atozuke: true,
    redDora: true,
    cpuAutoWin: true,
  },
});

const MAX_ITERATIONS = 4000;

/**
 * 指定したレベル構成で東風戦を自動進行させ、match_end に到達すること・
 * 点数の不変条件(合計が常に100000点)が保たれることを確認する。
 */
const playFullMatch = (levels: readonly [CpuLevel, CpuLevel, CpuLevel, CpuLevel], seed: number): void => {
  const config = configFor(levels);
  const rng = makeRng(seed);
  let state = GameEngine.createMatch(config, rng);

  let iterations = 0;
  while (state.phase.type !== "match_end") {
    iterations += 1;
    if (iterations > MAX_ITERATIONS) {
      throw new Error(`levels=${levels.join(",")} seed=${seed}: 反復上限に到達し、match_endに到達しなかった`);
    }

    const totalScore = state.players.reduce((sum, p) => sum + p.score, 0);
    expect(totalScore + state.kyotaku * 1000).toBe(100000);

    if (state.phase.type === "round_end") {
      state = GameEngine.apply(state, { type: "confirm" });
      continue;
    }

    let actingSeat: SeatIndex;
    if (state.phase.type === "turn") {
      actingSeat = state.phase.actor;
    } else {
      const responded = new Set(state.phase.responses.map((r) => r.seat));
      const pending = state.phase.eligible.find((seat) => !responded.has(seat));
      if (pending === undefined) {
        throw new Error("claimsフェーズなのに応答待ちの席がいない");
      }
      actingSeat = pending;
    }

    const view = GameEngine.viewFor(state, actingSeat);
    const level = config.players[actingSeat].cpuLevel ?? "beginner";
    const action = CpuAi.decide(view, level, rng);

    // 返す action は必ず今動くべき席自身のものであること。
    expect(action.type).not.toBe("confirm");
    if (action.type !== "confirm") {
      expect(action.seat).toBe(actingSeat);
    }
    // apply が例外を投げない = GameEngine から見て合法な action であること。
    expect(() => {
      state = GameEngine.apply(state, action);
    }).not.toThrow();
  }

  expect(state.phase.type).toBe("match_end");
  const finalTotal = state.players.reduce((sum, p) => sum + p.score, 0);
  expect(finalTotal + state.kyotaku * 1000).toBe(100000);
};

test(
  "標準レベル4人で東風戦を最初から最後まで自動進行させるとmatch_endに到達し、点数の不変条件が保たれる",
  () => {
    playFullMatch(["standard", "standard", "standard", "standard"], 7);
  },
  30000,
);

test(
  "上級レベル4人で東風戦を最初から最後まで自動進行させるとmatch_endに到達し、点数の不変条件が保たれる",
  () => {
    playFullMatch(["advanced", "advanced", "advanced", "advanced"], 2);
  },
  30000,
);

test(
  "レベルが混在していても(入門・標準・上級・標準)最後まで自動進行できる",
  () => {
    playFullMatch(["beginner", "standard", "advanced", "standard"], 55);
  },
  30000,
);
