import { expect, test } from "vitest";

import { Game, GameAction } from "../index.ts";
import { sessionOf, startedSession } from "./game-fixture.ts";

const IDLE_HAND = "ton ton nan nan sha sha pei pei haku haku hatsu hatsu chun";

test("対戦を開始すると各家に13枚が配られる", () => {
  const session = startedSession();
  expect(
    session.round.seats.map((seat) => seat.hand.concealed.length),
  ).toStrictEqual([13, 13, 13, 13]);
});

test("配牌直後のツモ可能な残り山は70枚になる", () => {
  expect(Game.viewFor(startedSession(), 0).remaining).toBe(70);
});

test("対戦開始時は東一局0本場供託0本になる", () => {
  const view = Game.viewFor(startedSession(), 0);
  expect([view.roundWind, view.roundNumber, view.honba, view.riichiSticks]).toStrictEqual([
    "ton",
    1,
    0,
    0,
  ]);
});

test("対戦開始時の持ち点は全員25000点になる", () => {
  expect(startedSession().match.scores).toStrictEqual([
    25000, 25000, 25000, 25000,
  ]);
});

test("対戦開始時にドラ表示牌が1枚めくられている", () => {
  expect(Game.viewFor(startedSession(), 0).doraIndicators).toHaveLength(1);
});

test("親から手番が始まる", () => {
  expect(startedSession().round.turn).toBe(0);
});

test("ツモすると手牌が14枚になり残り山が1枚減る", () => {
  const drawn = Game.autoStep(startedSession());
  expect([
    drawn?.round.seats[0].hand.concealed.length,
    drawn === null ? null : Game.viewFor(drawn, 0).remaining,
  ]).toStrictEqual([14, 69]);
});

test("ツモして打牌すると手番が下家へ移る", () => {
  const session = sessionOf({
    seats: [
      { hand: "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5p 5p 5p" },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  const discarded = Game.apply(session, 0, GameAction.discard(0));
  const advanced = Game.autoStep(discarded) ?? discarded;
  expect(advanced.round.turn).toBe(1);
});

test("打牌した牌は捨て牌河に残る", () => {
  const session = sessionOf({
    seats: [
      { hand: "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5p 5p 5p" },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  const discarded = Game.apply(session, 0, GameAction.discard(0));
  expect(discarded.round.seats[0].river.discards).toHaveLength(1);
});

test("リーチしていなければ手牌のどの牌でも捨てられる", () => {
  const session = sessionOf({
    seats: [
      { hand: "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5p 5p 5p" },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  expect(
    Game.availableActions(session, 0).filter(
      (action) => action.type === "discard",
    ),
  ).toHaveLength(14);
});

test("手番でないプレイヤーは行動できない", () => {
  const session = sessionOf({
    seats: [
      { hand: "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5p 5p 5p" },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  expect(Game.availableActions(session, 2)).toStrictEqual([]);
});

test("自分の視点には他家の手牌が含まれない", () => {
  const view = Game.viewFor(startedSession(), 0);
  expect(Object.keys(view)).not.toContain("hands");
});

test("自分の視点では全員の捨て牌と鳴き面子を参照できる", () => {
  const view = Game.viewFor(startedSession(), 0);
  expect([view.rivers.length, view.melds.length]).toStrictEqual([4, 4]);
});
