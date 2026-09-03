import { test, expect } from "vitest";

import { PlayerConfig } from "@/src/domains/player-config";
import { RoundState } from "@/src/domains/round-state";
import { RuleConfig } from "@/src/domains/rule-config";
import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { TableView } from "..";

const game = () => ({
  players: PlayerConfig.defaults(),
  rules: RuleConfig.default(),
  scores: [25000, 25000, 25000, 25000],
  round: RoundState.create({ roundWind: "ton", roundNumber: 1, honba: 0, kyotaku: 0, dealer: 0, wall: Wall.create(createSeededRandom(4), true) }),
  status: "playing" as const,
  history: [],
});

test("卓情報には自分の手牌と公開情報だけが含まれ、他家の手牌と牌山は含まれない", () => {
  const view = TableView.from(game(), 1);
  expect(view.hand).toHaveLength(13);
  expect(view.seats).toHaveLength(4);
  expect(view.seats[0].handCount).toBe(13);
  expect(view.seats[0].hasDrawn).toBe(true);
  expect(Object.keys(view)).not.toContain("wall");
  expect(Object.keys(view.seats[0])).not.toContain("hand");
});

test("卓情報には局・本場・供託・親・残り山・ドラ表示牌が含まれる", () => {
  const view = TableView.from(game(), 0);
  expect(view.roundWind).toBe("ton");
  expect(view.roundNumber).toBe(1);
  expect(view.honba).toBe(0);
  expect(view.kyotaku).toBe(0);
  expect(view.dealer).toBe(0);
  expect(view.remaining).toBe(69);
  expect(view.doraIndicators).toHaveLength(1);
  expect(TableView.doraTiles(view)).toStrictEqual([Tile.next(view.doraIndicators[0])]);
});

test("見えている枚数は自分の手牌とドラ表示牌を含む", () => {
  const state = game();
  const view = TableView.from(state, 0);
  const own = [...state.round.seats[0].hand, state.round.seats[0].drawnTile ?? "1m", ...view.doraIndicators];
  expect(view.visibleCounts).toStrictEqual(Tile.counts(own));
});
