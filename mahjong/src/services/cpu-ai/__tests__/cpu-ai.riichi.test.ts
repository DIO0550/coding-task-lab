import { test, expect } from "vitest";

import { TableView } from "@/src/domains/table-view";
import type { Tile } from "@/src/domains/tile";
import { GameEngine } from "@/src/services/game-engine";
import { startGame } from "@/src/services/game-engine/__tests__/fixtures";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { CpuAi } from "..";

const rng = () => createSeededRandom(5);

/** 断么九の 3p/6p 待ち(良形) */
const GOOD_WAIT: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];
/** 5m 単騎待ち */
const TANKI: readonly Tile[] = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"];

test("入門 CPU はテンパイしたら常にリーチを宣言する", () => {
  const game = startGame({ hands: [TANKI, null, null, null], draws: ["chun"] });
  const decided = CpuAi.decide(TableView.from(game, 0), GameEngine.availableActions(game, 0), "beginner", game.rules, rng());
  expect(decided).toMatchObject({ type: "discard", riichi: true });
});

test("標準 CPU は待ちの残り枚数が十分ならリーチを宣言する", () => {
  const game = startGame({ hands: [GOOD_WAIT, null, null, null], draws: ["chun"] });
  const decided = CpuAi.decide(TableView.from(game, 0), GameEngine.availableActions(game, 0), "standard", game.rules, rng());
  expect(decided).toStrictEqual({ type: "discard", tile: "chun", riichi: true });
});

test("標準 CPU は待ち牌がほとんど見えている(残り1枚以下)ならリーチせず打牌する", () => {
  const game = startGame({ hands: [TANKI, null, null, null], draws: ["chun"] });
  // 5m 単騎でも中単騎でも待ちは残っていない
  const river = [
    { tile: "5m" as const, isRiichi: false, calledBy: null },
    { tile: "chun" as const, isRiichi: false, calledBy: null },
  ];
  const seen = {
    ...game,
    round: { ...game.round, seats: game.round.seats.map((seat, index) => (index === 0 ? seat : { ...seat, river })) },
  };
  const decided = CpuAi.decide(TableView.from(seen, 0), GameEngine.availableActions(seen, 0), "standard", game.rules, rng());
  expect(decided).toMatchObject({ type: "discard", riichi: false });
});

test("リーチ後の CPU はツモ切りする", () => {
  const game = startGame({ hands: [TANKI, null, null, null], draws: ["chun", "hatsu", "hatsu", "hatsu", "pei"] });
  const riichi = GameEngine.apply(game, 0, { type: "discard", tile: "chun", riichi: true }, rng());
  const around = [1, 2, 3].reduce(
    (current, seat) => GameEngine.apply(current, seat as 1 | 2 | 3, { type: "discard", tile: "hatsu", riichi: false }, rng()),
    riichi,
  );
  const decided = CpuAi.decide(TableView.from(around, 0), GameEngine.availableActions(around, 0), "advanced", game.rules, rng());
  expect(decided).toStrictEqual({ type: "discard", tile: "pei", riichi: false });
});
