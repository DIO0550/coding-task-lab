import { test, expect } from "vitest";

import { PlayerConfig } from "@/src/domains/player-config";
import { RuleConfig } from "@/src/domains/rule-config";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { GameEngine } from "..";

import { JUNK_HANDS, startGame } from "./fixtures";

test("対戦開始時は東一局0本場・供託0本で各家25,000点から始まる", () => {
  const game = GameEngine.start({ players: PlayerConfig.defaults(), rules: RuleConfig.default() }, createSeededRandom(1));
  expect(game.round.roundWind).toBe("ton");
  expect(game.round.roundNumber).toBe(1);
  expect(game.round.honba).toBe(0);
  expect(game.round.kyotaku).toBe(0);
  expect(game.scores).toStrictEqual([25000, 25000, 25000, 25000]);
  expect(game.status).toBe("playing");
});

test("配牌後は各家13枚で、親が第一ツモを持ち、残り山は69枚になる", () => {
  const game = GameEngine.start({ players: PlayerConfig.defaults(), rules: RuleConfig.default() }, createSeededRandom(2));
  expect(game.round.seats.map((seat) => seat.hand.length)).toStrictEqual([13, 13, 13, 13]);
  expect(game.round.seats[0].drawnTile).not.toBeNull();
  expect(game.round.seats.slice(1).every((seat) => seat.drawnTile === null)).toBe(true);
  expect(GameEngine.viewFor(game, 0).remaining).toBe(69);
  expect(game.round.phase).toStrictEqual({ type: "action", seat: 0, afterKan: false, forbiddenDiscard: null });
});

test("30,000点持ちの設定では各家30,000点から始まる", () => {
  const rules = RuleConfig.with(RuleConfig.default(), { startingPoints: 30000 });
  const game = GameEngine.start({ players: PlayerConfig.defaults(), rules }, createSeededRandom(3));
  expect(game.scores).toStrictEqual([30000, 30000, 30000, 30000]);
});

test("ドラ表示牌は開始時に1枚めくられている", () => {
  const game = startGame({ hands: JUNK_HANDS, doraIndicators: ["5p"] });
  expect(GameEngine.viewFor(game, 0).doraIndicators).toStrictEqual(["5p"]);
});

test("指定した並びの牌山からは指定どおりに配牌される", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  expect(game.round.seats[0].hand).toStrictEqual(JUNK_HANDS[0]);
  expect(game.round.seats[0].drawnTile).toBe("9m");
  expect(game.round.seats[2].hand).toStrictEqual(JUNK_HANDS[2]);
});

test("開始局を指定して対局を始められる", () => {
  const game = startGame({ hands: JUNK_HANDS, dealer: 2, initial: { roundWind: "nan", roundNumber: 3, honba: 2, kyotaku: 1 } });
  expect(game.round.dealer).toBe(2);
  expect(game.round.roundWind).toBe("nan");
  expect(game.round.roundNumber).toBe(3);
  expect(game.round.honba).toBe(2);
  expect(game.round.kyotaku).toBe(1);
  expect(game.round.phase).toMatchObject({ type: "action", seat: 2 });
});
