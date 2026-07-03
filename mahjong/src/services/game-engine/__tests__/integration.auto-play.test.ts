import { test, expect } from "vitest";

import type { MatchConfig, SeatIndex } from "../../../domains/game/index.ts";
import type { Rng } from "../../../types/rng.ts";
import { CpuAi } from "../../cpu-ai/index.ts";
import { GameEngine } from "../index.ts";

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

const cpuOnlyConfig = (): MatchConfig => ({
  players: [
    { kind: "cpu", name: "CPU0", cpuLevel: "beginner" },
    { kind: "cpu", name: "CPU1", cpuLevel: "beginner" },
    { kind: "cpu", name: "CPU2", cpuLevel: "beginner" },
    { kind: "cpu", name: "CPU3", cpuLevel: "beginner" },
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

test(
  "CPU4人で東風戦を最初から最後まで自動進行させるとmatch_endに到達し、点数の不変条件が保たれる",
  () => {
    const seeds = [1, 2, 3, 7, 42];

    for (const seed of seeds) {
      const config = cpuOnlyConfig();
      const rng = makeRng(seed);
      let state = GameEngine.createMatch(config, rng);

      let iterations = 0;
      while (state.phase.type !== "match_end") {
        iterations += 1;
        if (iterations > MAX_ITERATIONS) {
          throw new Error(`seed=${seed}: 反復上限(${MAX_ITERATIONS})に到達し、match_endに到達しなかった`);
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
            throw new Error(`seed=${seed}: claimsフェーズなのに応答待ちの席がいない`);
          }
          actingSeat = pending;
        }

        const view = GameEngine.viewFor(state, actingSeat);
        const level = config.players[actingSeat].cpuLevel ?? "beginner";
        const action = CpuAi.decide(view, level, rng);
        state = GameEngine.apply(state, action);
      }

      expect(state.phase.type).toBe("match_end");
      const finalTotal = state.players.reduce((sum, p) => sum + p.score, 0);
      expect(finalTotal + state.kyotaku * 1000).toBe(100000);
      if (state.phase.type === "match_end") {
        expect(state.phase.ranking).toHaveLength(4);
        expect([...state.phase.ranking].sort((a, b) => a.rank - b.rank).map((r) => r.rank)).toEqual([1, 2, 3, 4]);
      }
    }
  },
  60000,
);
