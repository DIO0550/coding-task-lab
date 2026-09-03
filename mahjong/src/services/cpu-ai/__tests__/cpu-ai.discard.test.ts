import { test, expect } from "vitest";

import { PlayerConfig, type CpuLevel } from "@/src/domains/player-config";
import { Shanten } from "@/src/domains/shanten";
import { TableView } from "@/src/domains/table-view";
import { Tile } from "@/src/domains/tile";
import { GameEngine } from "@/src/services/game-engine";
import { startGame } from "@/src/services/game-engine/__tests__/fixtures";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { CpuAi } from "..";

const rng = () => createSeededRandom(3);

/** 面子と両面ターツが揃い、字牌1枚だけが浮いている一向聴 */
const ONE_AWAY: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "pei"];

test("入門 CPU は孤立した字牌から切る", () => {
  const game = startGame({ hands: [ONE_AWAY, null, null, null], draws: ["chun"] });
  const decided = CpuAi.decide(TableView.from(game, 0), GameEngine.availableActions(game, 0), "beginner", game.rules, rng());
  expect(decided.type === "discard" && Tile.isHonor(decided.tile)).toBe(true);
});

test.each(["beginner", "standard", "advanced"] as const)("%s の CPU は向聴数を最も下げる打牌を選ぶ", (level: CpuLevel) => {
  const game = startGame({ hands: [ONE_AWAY, null, null, null], draws: ["chun"] });
  const view = TableView.from(game, 0);
  const decided = CpuAi.decide(view, GameEngine.availableActions(game, 0), level, game.rules, rng());
  const concealed = [...view.hand, "chun" as const];
  const best = Math.min(...Shanten.evaluateDiscards(concealed, 0, view.visibleCounts).map((e) => e.shanten));
  const chosen = decided.type === "discard" ? Shanten.calculate(Tile.removeOne(concealed, decided.tile), 0) : Infinity;
  expect(chosen).toBe(best);
});

test("標準 CPU は向聴数が同じなら受け入れ枚数の多い打牌を選ぶ", () => {
  // 2m3m4m 5m6m7m 3s3s3s 6s6s 4p + 5p ツモ: 4p/5p どちらを切っても一向聴ではなく、45p を残せば 3p6p 待ちのテンパイになるので字牌はない。
  // ここでは 8p と 9s が浮いている二向聴で、8p(受け入れ 7p9p など)より 9s(受け入れ 7s8s)を切る方が広い
  const hand: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "3s", "3s", "3s", "6s", "6s", "4p", "8p", "9s"];
  const game = startGame({ hands: [hand, null, null, null], draws: ["1p"] });
  const view = TableView.from(game, 0);
  const decided = CpuAi.decide(view, GameEngine.availableActions(game, 0), "standard", game.rules, rng());
  const concealed = [...view.hand, "1p" as const];
  const evaluations = Shanten.evaluateDiscards(concealed, 0, view.visibleCounts);
  const bestShanten = Math.min(...evaluations.map((e) => e.shanten));
  const bestUkeire = Math.max(...evaluations.filter((e) => e.shanten === bestShanten).map((e) => e.ukeire));
  const chosen = evaluations.find((e) => decided.type === "discard" && e.tile === decided.tile);
  expect(chosen?.shanten).toBe(bestShanten);
  expect(chosen?.ukeire).toBe(bestUkeire);
});

test("標準 CPU は他家がリーチしていてテンパイしていなければ現物を優先して切る", () => {
  // 東家(CPU)は 9m を持つ二向聴。南家はリーチ中で河に 9m がある
  const hand: readonly Tile[] = ["2m", "3m", "4m", "5m", "7m", "9m", "3s", "3s", "3s", "6s", "8s", "4p", "6p"];
  const game = startGame({
    hands: [hand, null, null, null],
    draws: ["chun"],
    players: [PlayerConfig.cpu("CPU 0", "standard"), PlayerConfig.human("P1"), PlayerConfig.human("P2"), PlayerConfig.human("P3")],
  });
  const withRiichi = {
    ...game,
    round: {
      ...game.round,
      seats: game.round.seats.map((seat, index) =>
        index === 1 ? { ...seat, riichi: "riichi" as const, river: [{ tile: "9m" as const, isRiichi: true, calledBy: null }] } : seat,
      ),
    },
  };
  const decided = CpuAi.decide(TableView.from(withRiichi, 0), GameEngine.availableActions(withRiichi, 0), "standard", game.rules, rng());
  expect(decided).toMatchObject({ type: "discard", tile: "9m" });
});

test("上級 CPU は他家がリーチしていて二向聴以上なら最も安全な牌を切って降りる", () => {
  const hand: readonly Tile[] = ["2m", "3m", "4m", "5m", "7m", "9m", "3s", "3s", "3s", "6s", "8s", "4p", "6p"];
  const game = startGame({ hands: [hand, null, null, null], draws: ["chun"] });
  const withRiichi = {
    ...game,
    round: {
      ...game.round,
      seats: game.round.seats.map((seat, index) =>
        index === 2 ? { ...seat, riichi: "riichi" as const, river: [{ tile: "9m" as const, isRiichi: true, calledBy: null }] } : seat,
      ),
    },
  };
  const decided = CpuAi.decide(TableView.from(withRiichi, 0), GameEngine.availableActions(withRiichi, 0), "advanced", game.rules, rng());
  expect(decided).toMatchObject({ type: "discard", tile: "9m" });
});

test("入門 CPU は他家がリーチしていても牌効率だけで打牌する", () => {
  const hand: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "9m"];
  const game = startGame({ hands: [hand, null, null, null], draws: ["pei"] });
  const withRiichi = {
    ...game,
    round: {
      ...game.round,
      seats: game.round.seats.map((seat, index) =>
        index === 1 ? { ...seat, riichi: "riichi" as const, river: [{ tile: "4p" as const, isRiichi: true, calledBy: null }] } : seat,
      ),
    },
  };
  const decided = CpuAi.decide(TableView.from(withRiichi, 0), GameEngine.availableActions(withRiichi, 0), "beginner", game.rules, rng());
  expect(decided.type === "discard" && ["pei", "9m"].includes(decided.tile)).toBe(true);
});
