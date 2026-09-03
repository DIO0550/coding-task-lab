import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";

import { confirm, discard, startGame, withRemaining } from "./fixtures";

/** 5m 単騎のテンパイ形 */
const TENPAI: readonly Tile[] = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"];

/** 残り山1枚の状態から: 東家が打牌 → 南家が海底牌(hatsu)をツモ切り → 荒牌流局 */
const exhaust = (game: ReturnType<typeof startGame>) =>
  discard(discard(withRemaining(game, 1), 0, game.round.seats[0].drawnTile ?? "chun"), 1, "hatsu");

test("山が尽きると荒牌流局になり、テンパイ者1人がノーテン者3人から1,000点ずつ受け取る", () => {
  const game = startGame({ hands: [TENPAI, null, null, null], draws: ["chun"], haitei: ["hatsu"] });
  const ended = exhaust(game);
  expect(ended.round.phase).toMatchObject({
    type: "ended",
    result: { type: "draw", tenpaiSeats: [0], deltas: [3000, -1000, -1000, -1000], dealerContinues: true },
  });
});

test("親がテンパイなら連荘し、本場が1増える", () => {
  const game = startGame({ hands: [TENPAI, null, null, null], draws: ["chun"], haitei: ["hatsu"] });
  const next = confirm(exhaust(game));
  expect(next.round.dealer).toBe(0);
  expect(next.round.roundNumber).toBe(1);
  expect(next.round.honba).toBe(1);
  expect(next.scores).toStrictEqual([28000, 24000, 24000, 24000]);
});

test("親がノーテンなら輪荘し、本場が1増える", () => {
  const game = startGame({ hands: [null, TENPAI, null, null], draws: ["chun"], haitei: ["hatsu"] });
  const ended = exhaust(game);
  expect(ended.round.phase).toMatchObject({ type: "ended", result: { type: "draw", tenpaiSeats: [1], dealerContinues: false } });
  const next = confirm(ended);
  expect(next.round.dealer).toBe(1);
  expect(next.round.roundNumber).toBe(2);
  expect(next.round.honba).toBe(1);
});

test("テンパイ者2人なら1,500点ずつ、3人なら1,000点ずつ移動する", () => {
  const second: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];
  const third: readonly Tile[] = ["1p", "1p", "2p", "2p", "3p", "3p", "7m", "7m", "8m", "8m", "9m", "9m", "haku"];
  const two = exhaust(startGame({ hands: [TENPAI, second, null, null], draws: ["chun"], haitei: ["hatsu"] }));
  expect(two.round.phase).toMatchObject({ type: "ended", result: { deltas: [1500, 1500, -1500, -1500] } });
  const three = exhaust(startGame({ hands: [TENPAI, second, third, null], draws: ["chun"], haitei: ["hatsu"] }));
  expect(three.round.phase).toMatchObject({ type: "ended", result: { deltas: [1000, 1000, 1000, -3000] } });
});

test("全員ノーテンなら点数は移動しない", () => {
  const ended = exhaust(startGame({ hands: [null, null, null, null], draws: ["chun"], haitei: ["hatsu"] }));
  expect(ended.round.phase).toMatchObject({ type: "ended", result: { type: "draw", tenpaiSeats: [], deltas: [0, 0, 0, 0] } });
});

test("流局時の供託は次局へ持ち越される", () => {
  const game = startGame({ hands: [TENPAI, null, null, null], draws: ["chun"], haitei: ["hatsu"], initial: { kyotaku: 2 } });
  const next = confirm(exhaust(game));
  expect(next.round.kyotaku).toBe(2);
});

test("海底牌をツモった後の打牌にはロン以外の鳴きができない", () => {
  const ponHand: readonly Tile[] = ["3p", "3p", "1m", "4m", "7m", "1s", "4s", "7s", "nan", "sha", "pei", "haku", "hatsu"];
  const game = withRemaining(startGame({ hands: [null, null, ponHand, null], draws: ["chun"], haitei: ["3p"] }), 1);
  const houtei = discard(discard(game, 0, "chun"), 1, "3p");
  expect(houtei.round.phase).toMatchObject({ type: "ended", result: { type: "draw" } });
});
