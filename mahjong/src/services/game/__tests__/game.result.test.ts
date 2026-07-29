import { expect, test } from "vitest";

import { Game, GameAction } from "../index.ts";
import { sessionOf } from "./game-fixture.ts";

const IDLE_HAND = "ton ton nan nan sha sha pei pei haku haku hatsu hatsu chun";
const NOTEN_HAND = "1m 4m 7m 2p 5p 8p 3s 6s 9s ton nan sha haku";
const TENPAI_HAND = "2m 3m 4m 6m 7m 8m 2s 3s 4s 6p 7p 9m 9m";
const DISCARDER_HAND = "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 1p 1p 5p";

/** 平和のみでツモ和了できる親の手牌(8p ツモ)。 */
const DEALER_TSUMO_HAND = "2m 3m 4m 6m 7m 8m 2s 3s 4s 6p 7p 8p 9m 9m";

const ronSession = () => {
  const session = sessionOf({
    seats: [
      { hand: DISCARDER_HAND },
      { hand: TENPAI_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
  });
  const discarded = Game.apply(session, 0, GameAction.discard(13));
  return Game.apply(discarded, 1, GameAction.ron());
};

test("ロン和了すると局が終わり結果が記録される", () => {
  expect(ronSession().round.result).toMatchObject({
    type: "win",
    winner: 1,
    loser: 0,
    winType: "ron",
  });
});

test("子のロン和了では放銃者だけが支払う", () => {
  expect(ronSession().round.result?.pointChanges).toStrictEqual([
    -1000, 1000, 0, 0,
  ]);
});

test("和了結果を確定すると持ち点に反映される", () => {
  expect(Game.confirmResult(ronSession()).match.scores).toStrictEqual([
    24000, 26000, 25000, 25000,
  ]);
});

test("子の和了では親が下家へ移り本場が0に戻る", () => {
  const next = Game.confirmResult(ronSession());
  expect([next.match.dealer, next.match.honba]).toStrictEqual([1, 0]);
});

test("親のツモ和了では3人が同額を支払う", () => {
  const session = sessionOf({
    seats: [
      { hand: DEALER_TSUMO_HAND, discards: "1s" },
      { hand: IDLE_HAND, discards: "1s" },
      { hand: IDLE_HAND, discards: "1s" },
      { hand: IDLE_HAND, discards: "1s" },
    ],
    turn: 0,
    phase: "action",
    drawn: "8p",
  });
  const won = Game.apply(session, 0, GameAction.tsumo());
  expect(won.round.result?.pointChanges).toStrictEqual([2100, -700, -700, -700]);
});

test("親の和了では連荘して本場が1つ増える", () => {
  const session = sessionOf({
    seats: [
      { hand: DEALER_TSUMO_HAND, discards: "1s" },
      { hand: IDLE_HAND, discards: "1s" },
      { hand: IDLE_HAND, discards: "1s" },
      { hand: IDLE_HAND, discards: "1s" },
    ],
    turn: 0,
    phase: "action",
    drawn: "8p",
  });
  const next = Game.confirmResult(Game.apply(session, 0, GameAction.tsumo()));
  expect([next.match.dealer, next.match.honba]).toStrictEqual([0, 1]);
});

test("和了者は供託のリーチ棒を受け取る", () => {
  const session = sessionOf({
    seats: [
      { hand: DISCARDER_HAND },
      { hand: TENPAI_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
    riichiSticks: 2,
  });
  const discarded = Game.apply(session, 0, GameAction.discard(13));
  const won = Game.apply(discarded, 1, GameAction.ron());
  expect(won.round.result?.pointChanges).toStrictEqual([-1000, 3000, 0, 0]);
});

test("和了すると供託は次局へ持ち越されない", () => {
  const session = sessionOf({
    seats: [
      { hand: DISCARDER_HAND },
      { hand: TENPAI_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
    riichiSticks: 2,
  });
  const discarded = Game.apply(session, 0, GameAction.discard(13));
  const next = Game.confirmResult(Game.apply(discarded, 1, GameAction.ron()));
  expect(next.match.riichiSticks).toBe(0);
});

test("山が尽きると荒牌流局になる", () => {
  const session = sessionOf({
    seats: [
      { hand: TENPAI_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
    ],
    turn: 0,
    phase: "draw",
    remaining: 0,
  });
  expect(Game.autoStep(session)?.round.result).toMatchObject({
    type: "exhaustive_draw",
    tenpai: [true, false, false, false],
  });
});

test("流局時はノーテン罰符として場3000点が移動する", () => {
  const session = sessionOf({
    seats: [
      { hand: TENPAI_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
    ],
    turn: 0,
    phase: "draw",
    remaining: 0,
  });
  expect(Game.autoStep(session)?.round.result?.pointChanges).toStrictEqual([
    3000, -1000, -1000, -1000,
  ]);
});

test("全員テンパイの流局では点数が動かない", () => {
  const session = sessionOf({
    seats: [
      { hand: TENPAI_HAND },
      { hand: TENPAI_HAND },
      { hand: TENPAI_HAND },
      { hand: TENPAI_HAND },
    ],
    turn: 0,
    phase: "draw",
    remaining: 0,
  });
  expect(Game.autoStep(session)?.round.result?.pointChanges).toStrictEqual([
    0, 0, 0, 0,
  ]);
});

test("流局で親がテンパイなら連荘して本場が増える", () => {
  const session = sessionOf({
    seats: [
      { hand: TENPAI_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
    ],
    turn: 0,
    phase: "draw",
    remaining: 0,
  });
  const drawn = Game.autoStep(session);
  const next = drawn === null ? session : Game.confirmResult(drawn);
  expect([next.match.dealer, next.match.honba]).toStrictEqual([0, 1]);
});

test("流局で親がノーテンなら親が移り本場が増える", () => {
  const session = sessionOf({
    seats: [
      { hand: NOTEN_HAND },
      { hand: TENPAI_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
    ],
    turn: 0,
    phase: "draw",
    remaining: 0,
  });
  const drawn = Game.autoStep(session);
  const next = drawn === null ? session : Game.confirmResult(drawn);
  expect([next.match.dealer, next.match.honba]).toStrictEqual([1, 1]);
});

test("流局では供託が次局へ持ち越される", () => {
  const session = sessionOf({
    seats: [
      { hand: TENPAI_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
      { hand: NOTEN_HAND },
    ],
    turn: 0,
    phase: "draw",
    remaining: 0,
    riichiSticks: 1,
  });
  const drawn = Game.autoStep(session);
  const next = drawn === null ? session : Game.confirmResult(drawn);
  expect(next.match.riichiSticks).toBe(1);
});
