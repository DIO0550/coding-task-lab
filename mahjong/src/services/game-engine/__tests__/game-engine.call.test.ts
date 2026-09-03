import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";
import type { Tile } from "@/src/domains/tile";

import { GameEngine } from "..";

import { actionTypes, apply, discard, passTurn, startGame } from "./fixtures";

/** 南家: 1p2p を持ち 3p をチーできる */
const CHI_HAND: readonly Tile[] = ["1p", "2p", "2m", "5m", "8m", "2s", "5s", "8s", "ton", "nan", "sha", "pei", "haku"];
/** 西家: 3p3p を持ち 3p をポンできる */
const PON_HAND: readonly Tile[] = ["3p", "3p", "1m", "4m", "7m", "1s", "4s", "7s", "nan", "sha", "pei", "haku", "hatsu"];
/** 北家: 断么九の 3p/6p 待ち */
const RON_HAND: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];

const setup = () => startGame({ hands: [null, CHI_HAND, PON_HAND, RON_HAND], draws: ["3p"], doraIndicators: ["ton"] });

test("打牌に対してチー・ポン・ロンできる席が応答待ちになり、下家だけがチーできる", () => {
  const game = discard(setup(), 0, "3p");
  expect(game.round.phase).toMatchObject({ type: "call", discarder: 0, tile: "3p", candidates: [1, 2, 3], ronCandidates: [3] });
  expect(actionTypes(game, 1)).toStrictEqual(["chi", "pass"]);
  expect(actionTypes(game, 2)).toStrictEqual(["pon", "pass"]);
  expect(actionTypes(game, 3)).toStrictEqual(["ron", "pass"]);
  expect(GameEngine.pendingSeats(game)).toStrictEqual([1, 2, 3]);
});

test("ロンはポン・チーより優先される", () => {
  const game = discard(setup(), 0, "3p");
  const responded = apply(apply(game, 1, PlayerAction.chi(["1p", "2p"])), 2, PlayerAction.pon(["3p", "3p"]));
  expect(responded.round.phase.type).toBe("call");
  const resolved = apply(responded, 3, PlayerAction.ron());
  expect(resolved.round.phase).toMatchObject({ type: "ended", result: { type: "win", winner: 3, loser: 0, winType: "ron" } });
});

test("ポンはチーより優先され、ポンした席の手番になる", () => {
  const game = discard(setup(), 0, "3p");
  const resolved = apply(
    apply(apply(game, 3, PlayerAction.pass()), 1, PlayerAction.chi(["1p", "2p"])),
    2,
    PlayerAction.pon(["3p", "3p"]),
  );
  expect(resolved.round.phase).toMatchObject({ type: "action", seat: 2, forbiddenDiscard: "3p" });
  expect(resolved.round.seats[2].melds).toStrictEqual([{ type: "pon", tiles: ["3p", "3p", "3p"], calledTile: "3p", from: 0 }]);
  expect(resolved.round.seats[2].hand).toHaveLength(11);
  expect(resolved.round.seats[2].drawnTile).toBeNull();
  expect(resolved.round.seats[0].river[0].calledBy).toBe(2);
});

test("ロン・ポンがなければチーが成立し、鳴いた牌の喰い替えはできない", () => {
  const game = discard(setup(), 0, "3p");
  const resolved = apply(
    apply(apply(game, 3, PlayerAction.pass()), 2, PlayerAction.pass()),
    1,
    PlayerAction.chi(["1p", "2p"]),
  );
  expect(resolved.round.phase).toMatchObject({ type: "action", seat: 1 });
  expect(resolved.round.seats[1].melds).toStrictEqual([{ type: "chi", tiles: ["1p", "2p", "3p"], calledTile: "3p", from: 0 }]);
  expect(GameEngine.availableActions(resolved, 1).some((action) => action.type === "discard" && action.tile === "3p")).toBe(false);
});

test("ポンした席が打牌すると、その下家がツモる", () => {
  const game = discard(setup(), 0, "3p");
  const ponned = apply(
    apply(apply(game, 3, PlayerAction.pass()), 1, PlayerAction.pass()),
    2,
    PlayerAction.pon(["3p", "3p"]),
  );
  const next = discard(ponned, 2, "hatsu");
  expect(next.round.phase).toMatchObject({ type: "action", seat: 3 });
  expect(next.round.seats[3].drawnTile).not.toBeNull();
});

test("全員がパスすると下家がツモる", () => {
  const game = discard(setup(), 0, "3p");
  const passed = [3, 2, 1].reduce((current, seat) => apply(current, seat as 1 | 2 | 3, PlayerAction.pass()), game);
  expect(passed.round.phase).toMatchObject({ type: "action", seat: 1 });
  expect(passed.round.seats[1].drawnTile).not.toBeNull();
});

test("鳴きが入ると全員の一発が消える", () => {
  const riichiHand: readonly Tile[] = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"];
  const game = startGame({ hands: [riichiHand, CHI_HAND, PON_HAND, null], draws: ["chun", "3p"] });
  const riichi = discard(game, 0, "chun", true);
  expect(riichi.round.seats[0].ippatsu).toBe(true);
  const called = apply(apply(discard(riichi, 1, "3p"), 2, PlayerAction.pon(["3p", "3p"])), 2, PlayerAction.pass());
  expect(called.round.phase).toMatchObject({ type: "action", seat: 2 });
  expect(called.round.seats[0].ippatsu).toBe(false);
  expect(called.round.callOccurred).toBe(true);
});

test("応答できない席の応答や、応答待ちでない席の鳴きは無視される", () => {
  const game = discard(setup(), 0, "3p");
  expect(apply(game, 0, PlayerAction.pass())).toBe(game);
  expect(apply(game, 3, PlayerAction.chi(["4p", "5p"]))).toBe(game);
  expect(apply(passTurn(setup(), 0), 1, PlayerAction.pon(["3p", "3p"]))).toStrictEqual(passTurn(setup(), 0));
});

test("大明カンは応答の選択肢に含まれ、成立すると新ドラをめくって嶺上牌をツモる", () => {
  const kanHand: readonly Tile[] = ["3p", "3p", "3p", "1m", "4m", "7m", "1s", "4s", "7s", "nan", "sha", "pei", "haku"];
  const game = discard(startGame({ hands: [null, null, kanHand, null], draws: ["3p"] }), 0, "3p");
  expect(actionTypes(game, 2)).toStrictEqual(["pon", "kan", "pass"]);
  const kanned = apply(game, 2, PlayerAction.kan("daiminkan", "3p"));
  expect(kanned.round.phase).toMatchObject({ type: "action", seat: 2, afterKan: true });
  expect(kanned.round.seats[2].melds[0]).toMatchObject({ type: "kan", tiles: ["3p", "3p", "3p", "3p"], from: 0 });
  expect(kanned.round.seats[2].drawnTile).not.toBeNull();
  expect(kanned.round.kanCount).toBe(1);
  expect(GameEngine.viewFor(kanned, 2).doraIndicators).toHaveLength(2);
});
