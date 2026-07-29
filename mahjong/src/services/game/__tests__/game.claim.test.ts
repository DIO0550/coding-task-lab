import { expect, test } from "vitest";

import { Game, GameAction } from "../index.ts";
import { sessionOf } from "./game-fixture.ts";

/** 打牌に対して何も宣言できない手牌。 */
const IDLE_HAND = "ton ton nan nan sha sha pei pei haku haku hatsu hatsu chun";

/** 5p でチーできる手牌。 */
const CHI_HAND = "3p 4p ton ton nan nan sha sha pei pei haku haku hatsu";

/** 5p でポンできる手牌。 */
const PON_HAND = "5p 5p ton ton nan nan sha sha pei pei haku haku hatsu";

/** 5p で平和のロンができる手牌。 */
const RON_HAND = "2m 3m 4m 6m 7m 8m 2s 3s 4s 6p 7p 9m 9m";

const discardedSession = (
  seats: readonly string[],
  discards: readonly string[] = ["", "", "", ""],
) => {
  const session = sessionOf({
    seats: seats.map((hand, index) => ({ hand, discards: discards[index] })),
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  return Game.apply(session, 0, GameAction.discard(13));
};

const DISCARDER_HAND = "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 1p 1p 5p";

test("ロンとポンとチーが同時に宣言された場合はロンが優先される", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    CHI_HAND,
    PON_HAND,
    RON_HAND,
  ]);
  const withChi = Game.apply(discarded, 1, GameAction.chi(
    Game.availableActions(discarded, 1).flatMap((action) =>
      action.type === "chi" ? [action.tiles] : [],
    )[0],
  ));
  const withPon = Game.apply(withChi, 2, GameAction.pon(
    Game.availableActions(withChi, 2).flatMap((action) =>
      action.type === "pon" ? [action.tiles] : [],
    )[0],
  ));
  const resolved = Game.apply(withPon, 3, GameAction.ron());
  expect(resolved.round.result).toMatchObject({ type: "win", winner: 3 });
});

test("ロンが宣言されなければポンがチーより優先される", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    CHI_HAND,
    PON_HAND,
    RON_HAND,
  ]);
  const withChi = Game.apply(discarded, 1, GameAction.chi(
    Game.availableActions(discarded, 1).flatMap((action) =>
      action.type === "chi" ? [action.tiles] : [],
    )[0],
  ));
  const withPon = Game.apply(withChi, 2, GameAction.pon(
    Game.availableActions(withChi, 2).flatMap((action) =>
      action.type === "pon" ? [action.tiles] : [],
    )[0],
  ));
  const resolved = Game.apply(withPon, 3, GameAction.pass());
  expect([resolved.round.turn, resolved.round.seats[2].hand.melds.length]).toStrictEqual([
    2, 1,
  ]);
});

test("誰も宣言しなければ手番が下家へ移る", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    CHI_HAND,
    PON_HAND,
    RON_HAND,
  ]);
  const passed = [1, 2, 3].reduce(
    (current, seat) => Game.apply(current, seat, GameAction.pass()),
    discarded,
  );
  expect(passed.round.turn).toBe(1);
});

test("チーは上家からの打牌にだけ宣言できる", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    IDLE_HAND,
    CHI_HAND,
    IDLE_HAND,
  ]);
  expect(
    Game.availableActions(discarded, 2).some((action) => action.type === "chi"),
  ).toBe(false);
});

test("ポンは上家以外からの打牌にも宣言できる", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    IDLE_HAND,
    PON_HAND,
    IDLE_HAND,
  ]);
  expect(
    Game.availableActions(discarded, 2).some((action) => action.type === "pon"),
  ).toBe(true);
});

test("フリテンの手ではロンを宣言できない", () => {
  const discarded = discardedSession(
    [DISCARDER_HAND, IDLE_HAND, IDLE_HAND, RON_HAND],
    ["", "", "", "5p"],
  );
  expect(
    Game.availableActions(discarded, 3).some((action) => action.type === "ron"),
  ).toBe(false);
});

test("フリテンでなければロンを宣言できる", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    IDLE_HAND,
    IDLE_HAND,
    RON_HAND,
  ]);
  expect(
    Game.availableActions(discarded, 3).some((action) => action.type === "ron"),
  ).toBe(true);
});

test("ロンを見逃すと同巡内はフリテンになる", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    IDLE_HAND,
    IDLE_HAND,
    RON_HAND,
  ]);
  const passed = Game.apply(discarded, 3, GameAction.pass());
  expect(passed.round.seats[3].temporaryFuriten).toBe(true);
});

test("ポンすると鳴いたプレイヤーの手番になる", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    IDLE_HAND,
    PON_HAND,
    IDLE_HAND,
  ]);
  const ponTiles = Game.availableActions(discarded, 2).flatMap((action) =>
    action.type === "pon" ? [action.tiles] : [],
  )[0];
  const resolved = Game.apply(discarded, 2, GameAction.pon(ponTiles));
  expect([resolved.round.turn, resolved.round.phase]).toStrictEqual([
    2,
    "action",
  ]);
});

test("鳴かれた牌は打牌者の河から鳴かれた印が付く", () => {
  const discarded = discardedSession([
    DISCARDER_HAND,
    IDLE_HAND,
    PON_HAND,
    IDLE_HAND,
  ]);
  const ponTiles = Game.availableActions(discarded, 2).flatMap((action) =>
    action.type === "pon" ? [action.tiles] : [],
  )[0];
  const resolved = Game.apply(discarded, 2, GameAction.pon(ponTiles));
  expect(resolved.round.seats[0].river.discards[0].called).toBe(true);
});

test("リーチ済みのプレイヤーは鳴きを宣言できない", () => {
  const session = sessionOf({
    seats: [
      { hand: DISCARDER_HAND },
      { hand: IDLE_HAND },
      { hand: PON_HAND, riichi: true },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  const discarded = Game.apply(session, 0, GameAction.discard(13));
  expect(Game.availableActions(discarded, 2)).toStrictEqual([]);
});
