import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";

import { GameEngine } from "..";

import { JUNK_HANDS, discard, passTurn, startGame, withRemaining } from "./fixtures";

/** 1m2m3m 4p5p6p 7s8s9s 東東東 5m のテンパイ形(5m 単騎待ち) */
const TENPAI: readonly Tile[] = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"];

const hands = [TENPAI, null, null, null];

test("リーチ宣言で供託が1本増え、宣言者の持ち点が1,000点減る", () => {
  const game = startGame({ hands, draws: ["chun"] });
  const next = discard(game, 0, "chun", true);
  expect(next.round.kyotaku).toBe(1);
  expect(next.scores[0]).toBe(24000);
  expect(next.round.seats[0].riichi).toBe("double");
  expect(next.round.seats[0].river[0]).toStrictEqual({ tile: "chun", isRiichi: true, calledBy: null });
});

test("リーチはテンパイを保つ打牌に対してのみ宣言できる", () => {
  const game = startGame({ hands, draws: ["chun"] });
  const riichiTiles = GameEngine.availableActions(game, 0)
    .filter((action) => action.type === "discard" && action.riichi)
    .map((action) => (action.type === "discard" ? action.tile : ""));
  // 5m を切れば中の単騎、中を切れば 5m の単騎でテンパイを保てる。1m などを切るとテンパイが崩れる
  expect([...riichiTiles].sort()).toStrictEqual(["5m", "chun"]);
});

test("テンパイしていなければリーチは宣言できない", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  expect(GameEngine.availableActions(game, 0).some((action) => action.type === "discard" && action.riichi)).toBe(false);
});

test("持ち点が1,000点未満ならリーチできない", () => {
  const game = startGame({ hands, draws: ["chun"], initial: { scores: [900, 25000, 25000, 25000] } });
  expect(GameEngine.availableActions(game, 0).some((action) => action.type === "discard" && action.riichi)).toBe(false);
});

test("残り山が4枚未満ならリーチできない", () => {
  const game = withRemaining(startGame({ hands, draws: ["chun"] }), 3);
  expect(GameEngine.availableActions(game, 0).some((action) => action.type === "discard" && action.riichi)).toBe(false);
});

test("リーチ後はツモ切りしかできない(手替え不可)", () => {
  const game = startGame({ hands, draws: ["chun", "9p", "9s", "9m", "chun"] });
  const afterRiichi = [1, 2, 3].reduce((current, seat) => passTurn(current, seat as 1 | 2 | 3), discard(game, 0, "chun", true));
  expect(afterRiichi.round.phase).toMatchObject({ type: "action", seat: 0 });
  const discards = GameEngine.availableActions(afterRiichi, 0).filter((action) => action.type === "discard");
  expect(discards).toStrictEqual([{ type: "discard", tile: "chun", riichi: false }]);
});

test("第一打でのリーチはダブルリーチになり、鳴きが入った後や2巡目以降は通常のリーチになる", () => {
  const first = discard(startGame({ hands, draws: ["chun"] }), 0, "chun", true);
  expect(first.round.seats[0].riichi).toBe("double");
  const game = startGame({ hands, draws: ["chun", "9p", "9s", "9m", "hatsu"] });
  const secondTurn = [1, 2, 3].reduce((current, seat) => passTurn(current, seat as 1 | 2 | 3), discard(game, 0, "chun"));
  const late = discard(secondTurn, 0, "hatsu", true);
  expect(late.round.seats[0].riichi).toBe("riichi");
});
