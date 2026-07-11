import { test, expect } from "vitest";

import { Game } from "../index.ts";
import { Random } from "../../../libs/random/index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  defaultRule,
  fourPlayers,
  n,
  startWithOrder,
  ts,
} from "./helpers.ts";

test("対局開始で各家に13枚が配られ親が第1ツモを持って手番になる", () => {
  const state = Game.start(defaultRule(), fourPlayers(), Random.seeded(10));

  for (const player of state.players) {
    expect(player.hand).toHaveLength(13);
  }
  expect(state.dealer).toBe(0);
  expect(state.turn).toBe(0);
  expect(state.phase).toBe("action");
  expect(state.players[0].drawn).not.toBeNull();
  expect(state.players[1].drawn).toBeNull();
});

test("対局は東1局0本場・供託0・全員が設定持ち点で始まる", () => {
  const state = Game.start(
    defaultRule({ startingPoints: 30000 }),
    fourPlayers(),
    Random.seeded(11),
  );

  expect(state.roundWind).toBe("ton");
  expect(state.roundNumber).toBe(1);
  expect(state.honba).toBe(0);
  expect(state.riichiSticks).toBe(0);
  for (const player of state.players) {
    expect(player.points).toBe(30000);
  }
});

test("開局時の残り山は親の第1ツモを除いて69枚になる", () => {
  const state = Game.start(defaultRule(), fourPlayers(), Random.seeded(12));

  const view = Game.viewFor(state, 0);
  expect(view.wallRemaining).toBe(69);
  expect(view.doraIndicators).toHaveLength(1);
});

test("同じ乱数seedからは同じ開局状態が再現される", () => {
  const first = Game.start(defaultRule(), fourPlayers(), Random.seeded(42));
  const second = Game.start(defaultRule(), fourPlayers(), Random.seeded(42));

  expect(first).toEqual(second);
});

test("開局時の風は起家が東で下家順に南・西・北になる", () => {
  const state = Game.start(defaultRule(), fourPlayers(), Random.seeded(13));

  expect(Game.windOf(state, 0)).toBe("ton");
  expect(Game.windOf(state, 1)).toBe("nan");
  expect(Game.windOf(state, 2)).toBe("sha");
  expect(Game.windOf(state, 3)).toBe("pei");
});

test("固定牌山を注入すると指定どおりの配牌と第1ツモで始まる", () => {
  const junkD = ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, JUNK_C, junkD],
    draws: ["5m"],
  });

  expect(state.players[1].hand.map(n).toSorted()).toEqual(
    [...JUNK_B].toSorted(),
  );
  expect(state.players[0].drawn).toEqual(ts("5m")[0]);
});

test("他家から見たビューには自分の手牌だけが含まれ他家は枚数のみ公開される", () => {
  const state = Game.start(defaultRule(), fourPlayers(), Random.seeded(14));

  const view = Game.viewFor(state, 1);
  expect(view.self).toBe(1);
  expect(view.hand).toEqual(state.players[1].hand);
  expect(view.drawn).toBeNull();
  expect(view.players[0].handCount).toBe(14);
  expect(view.players[2].handCount).toBe(13);
  expect(Object.keys(view.players[0])).not.toContain("hand");
  expect(view.legalActions).toEqual([]);
});

test("開局直後の入力待ちは親である", () => {
  const state = Game.start(defaultRule(), fourPlayers(), Random.seeded(15));

  expect(Game.currentActor(state)).toBe(0);
  expect(Game.isFinished(state)).toBe(false);
});
