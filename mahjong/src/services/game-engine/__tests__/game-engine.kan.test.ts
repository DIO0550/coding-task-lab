import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";
import type { Tile } from "@/src/domains/tile";

import { GameEngine } from "..";

import { actionTypes, apply, discard, startGame } from "./fixtures";

/** 9s を3枚持ち、4枚目をツモると暗槓できる */
const KAN_HAND: readonly Tile[] = ["9s", "9s", "9s", "1m", "2m", "3m", "4p", "5p", "6p", "7p", "8p", "5m", "5m"];

test("暗槓すると新ドラをめくり、嶺上牌をツモって同じ席の手番が続く", () => {
  const game = startGame({ hands: [KAN_HAND, null, null, null], draws: ["9s"], rinshan: ["chun"] });
  expect(GameEngine.availableActions(game, 0)).toContainEqual({ type: "kan", kind: "ankan", tile: "9s" });
  const kanned = apply(game, 0, PlayerAction.kan("ankan", "9s"));
  expect(kanned.round.phase).toMatchObject({ type: "action", seat: 0, afterKan: true });
  expect(kanned.round.seats[0].melds).toStrictEqual([{ type: "ankan", tiles: ["9s", "9s", "9s", "9s"] }]);
  expect(kanned.round.seats[0].drawnTile).toBe("chun");
  expect(kanned.round.seats[0].hand).toHaveLength(10);
  expect(kanned.round.kanCount).toBe(1);
  expect(GameEngine.viewFor(kanned, 0).doraIndicators).toHaveLength(2);
  expect(GameEngine.viewFor(kanned, 0).remaining).toBe(68);
});

test("嶺上牌で和了形になれば嶺上開花としてツモ和了できる", () => {
  const game = startGame({ hands: [KAN_HAND, null, null, null], draws: ["9s"], rinshan: ["9p"] });
  const kanned = apply(game, 0, PlayerAction.kan("ankan", "9s"));
  expect(actionTypes(kanned, 0)).toContain("tsumo");
  const won = apply(kanned, 0, PlayerAction.tsumo());
  const result = won.round.phase.type === "ended" ? won.round.phase.result : null;
  expect(result?.type === "win" && result.scoring.yaku.map((y) => y.name)).toContain("rinshan");
});

test("加槓すると他家に槍槓のロン機会があり、誰もロンしなければ嶺上牌をツモる", () => {
  const ponHand: readonly Tile[] = ["3p", "3p", "1m", "4m", "7m", "1s", "4s", "7s", "nan", "sha", "pei", "haku", "hatsu"];
  const waiting: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];
  const game = startGame({ hands: [null, null, ponHand, waiting], draws: ["3p", "chun", "chun", "chun", "3p"], rinshan: ["9m"] });
  const ponned = apply(apply(discard(game, 0, "3p"), 3, PlayerAction.pass()), 2, PlayerAction.pon(["3p", "3p"]));
  const around = [3, 0, 1].reduce((current, seat) => discard(current, seat as 0 | 1 | 3, "chun"), discard(ponned, 2, "hatsu"));
  expect(around.round.seats[2].drawnTile).toBe("3p");
  expect(GameEngine.availableActions(around, 2)).toContainEqual({ type: "kan", kind: "kakan", tile: "3p" });
  const kakan = apply(around, 2, PlayerAction.kan("kakan", "3p"));
  expect(kakan.round.phase).toMatchObject({ type: "call", isChankan: true, discarder: 2, tile: "3p", candidates: [3] });
  const passed = apply(kakan, 3, PlayerAction.pass());
  expect(passed.round.phase).toMatchObject({ type: "action", seat: 2, afterKan: true });
  expect(passed.round.seats[2].melds[0]).toMatchObject({ type: "kan" });
  expect(passed.round.seats[2].drawnTile).toBe("9m");
});

test("槍槓でロンすると加槓した席が放銃者になる", () => {
  const ponHand: readonly Tile[] = ["3p", "3p", "1m", "4m", "7m", "1s", "4s", "7s", "nan", "sha", "pei", "haku", "hatsu"];
  const waiting: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];
  const game = startGame({ hands: [null, null, ponHand, waiting], draws: ["3p", "chun", "chun", "chun", "3p"] });
  const ponned = apply(apply(discard(game, 0, "3p"), 3, PlayerAction.pass()), 2, PlayerAction.pon(["3p", "3p"]));
  const around = [3, 0, 1].reduce((current, seat) => discard(current, seat as 0 | 1 | 3, "chun"), discard(ponned, 2, "hatsu"));
  const won = apply(apply(around, 2, PlayerAction.kan("kakan", "3p")), 3, PlayerAction.ron());
  expect(won.round.phase).toMatchObject({ type: "ended", result: { type: "win", winner: 3, loser: 2 } });
  const result = won.round.phase.type === "ended" ? won.round.phase.result : null;
  expect(result?.type === "win" && result.scoring.yaku.map((y) => y.name)).toContain("chankan");
});

test("リーチ後の暗槓は待ちが変わらない場合だけできる", () => {
  const game = startGame({ hands: [KAN_HAND, null, null, null], draws: ["chun", "hatsu", "hatsu", "hatsu", "9s"] });
  const riichi = discard(game, 0, "chun", true);
  const around = [1, 2, 3].reduce((current, seat) => discard(current, seat as 1 | 2 | 3, "hatsu"), riichi);
  expect(around.round.seats[0].drawnTile).toBe("9s");
  expect(GameEngine.availableActions(around, 0)).toContainEqual({ type: "kan", kind: "ankan", tile: "9s" });
});
