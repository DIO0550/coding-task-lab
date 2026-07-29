import { expect, test } from "vitest";

import { Meld } from "../../../domains/meld/index.ts";
import { Game, GameAction } from "../index.ts";
import { sessionOf, tiles } from "./game-fixture.ts";

const IDLE_HAND = "ton ton nan nan sha sha pei pei haku haku hatsu hatsu chun";

/** 1p を切ればテンパイになる門前の手牌(14枚)。 */
const TENPAI_HAND = "2m 3m 4m 6m 7m 8m 2s 3s 4s 6p 7p 9m 9m 1p";

/** TENPAI_HAND を並び替えたときの 1p の位置。 */
const DISCARD_INDEX = 8;

const riichiSession = (overrides = {}) =>
  sessionOf({
    seats: [
      { hand: TENPAI_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "1p",
    ...overrides,
  });

test("テンパイしている門前の手ではリーチを宣言できる", () => {
  expect(
    Game.availableActions(riichiSession(), 0).some(
      (action) => action.type === "riichi",
    ),
  ).toBe(true);
});

test("リーチ宣言で持ち点が1000点減る", () => {
  const declared = Game.apply(
    riichiSession(),
    0,
    GameAction.riichi(DISCARD_INDEX),
  );
  expect(declared.match.scores[0]).toBe(24000);
});

test("リーチ宣言で供託が1本増える", () => {
  const declared = Game.apply(
    riichiSession(),
    0,
    GameAction.riichi(DISCARD_INDEX),
  );
  expect(declared.round.riichiSticks).toBe(1);
});

test("リーチ宣言牌は河にリーチの印付きで置かれる", () => {
  const declared = Game.apply(
    riichiSession(),
    0,
    GameAction.riichi(DISCARD_INDEX),
  );
  expect(declared.round.seats[0].river.discards[0].riichi).toBe(true);
});

test("持ち点が1000点未満ならリーチを宣言できない", () => {
  const session = riichiSession({ scores: [900, 25000, 25000, 25000] });
  expect(
    Game.availableActions(session, 0).some(
      (action) => action.type === "riichi",
    ),
  ).toBe(false);
});

test("残り山が4枚未満ならリーチを宣言できない", () => {
  const session = riichiSession({ remaining: 3 });
  expect(
    Game.availableActions(session, 0).some(
      (action) => action.type === "riichi",
    ),
  ).toBe(false);
});

test("リーチ後はツモ切りしかできない", () => {
  const session = sessionOf({
    seats: [
      { hand: "2m 3m 4m 6m 7m 8m 2s 3s 4s 6p 7p 9m 9m 1p", riichi: true },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "1p",
  });
  expect(
    Game.availableActions(session, 0).filter(
      (action) => action.type === "discard",
    ),
  ).toHaveLength(1);
});

test("リーチ済みならもう一度リーチを宣言できない", () => {
  const session = sessionOf({
    seats: [
      { hand: TENPAI_HAND, riichi: true },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "1p",
  });
  expect(
    Game.availableActions(session, 0).some(
      (action) => action.type === "riichi",
    ),
  ).toBe(false);
});

test("副露している手ではリーチを宣言できない", () => {
  const session = sessionOf({
    seats: [
      {
        hand: "2m 3m 4m 6m 7m 8m 2s 3s 4s 9m 9m",
        melds: [Meld.pon(tiles("chun chun chun"), 1)],
      },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "9m",
  });
  expect(
    Game.availableActions(session, 0).some(
      (action) => action.type === "riichi",
    ),
  ).toBe(false);
});
