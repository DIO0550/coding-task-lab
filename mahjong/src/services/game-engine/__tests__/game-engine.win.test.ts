import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";
import type { Tile } from "@/src/domains/tile";

import { GameEngine } from "..";

import { apply, confirm, discard, startGame } from "./fixtures";

/** 断么九のみ(暗刻あり・平和なし)の 3p/6p 待ち: ロン 1翻40符、ツモ 2翻30符 */
const TANYAO: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];

test("子のロン和了で放銃者から点数が移動する(1翻40符=1,300点)", () => {
  const game = discard(startGame({ hands: [null, null, null, TANYAO], draws: ["3p"], doraIndicators: ["ton"] }), 0, "3p");
  const won = apply(game, 3, PlayerAction.ron());
  expect(won.round.phase).toMatchObject({
    type: "ended",
    result: { type: "win", winner: 3, loser: 0, winType: "ron", deltas: [-1300, 0, 0, 1300], dealerContinues: false },
  });
  const result = won.round.phase.type === "ended" ? won.round.phase.result : null;
  expect(result?.type === "win" && result.scoring.yaku.map((y) => y.name)).toContain("tanyao");
  expect(result?.type === "win" && result.scoring.fu).toBe(40);
});

test("本場と供託は和了者が受け取る", () => {
  const game = discard(
    startGame({ hands: [null, null, null, TANYAO], draws: ["3p"], doraIndicators: ["ton"], initial: { honba: 2, kyotaku: 1 } }),
    0,
    "3p",
  );
  const won = apply(game, 3, PlayerAction.ron());
  expect(won.round.phase).toMatchObject({ type: "ended", result: { deltas: [-1900, 0, 0, 2900] } });
  const next = confirm(won);
  expect(next.scores).toStrictEqual([23100, 25000, 25000, 27900]);
  expect(next.round.kyotaku).toBe(0);
});

test("子のツモ和了で親は2倍、他の子は1倍を支払う(2翻30符=1,000/500)", () => {
  // 第一ツモ和了(地和)を避けるため、一巡してから 3p をツモる
  const game = startGame({
    hands: [null, null, null, TANYAO],
    draws: ["haku", "haku", "haku", "chun", "hatsu", "hatsu", "hatsu", "3p"],
    doraIndicators: ["ton"],
  });
  const firstRound = discard([0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "haku"), game), 3, "chun");
  const northTurn = [0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "hatsu"), firstRound);
  const won = apply(northTurn, 3, PlayerAction.tsumo());
  expect(won.round.phase).toMatchObject({
    type: "ended",
    result: { type: "win", winner: 3, loser: null, winType: "tsumo", deltas: [-1000, -500, -500, 2000] },
  });
});

test("親のロン和了は子の1.5倍(1翻40符=2,000点)で、連荘して本場が1増える", () => {
  const game = startGame({ hands: [TANYAO, null, null, null], draws: ["haku", "3p"], doraIndicators: ["ton"] });
  const won = apply(discard(discard(game, 0, "haku"), 1, "3p"), 0, PlayerAction.ron());
  expect(won.round.phase).toMatchObject({ type: "ended", result: { winner: 0, loser: 1, deltas: [2000, -2000, 0, 0], dealerContinues: true } });
  const next = confirm(won);
  expect(next.round.dealer).toBe(0);
  expect(next.round.roundNumber).toBe(1);
  expect(next.round.honba).toBe(1);
  expect(next.scores).toStrictEqual([27000, 23000, 25000, 25000]);
});

test("親のツモ和了は全員から同額を受け取る(2翻30符=各1,000点)", () => {
  // 第一ツモ和了(天和)を避けるため、一巡してから 3p をツモる
  const game = startGame({ hands: [TANYAO, null, null, null], draws: ["haku", "hatsu", "hatsu", "hatsu", "3p"], doraIndicators: ["ton"] });
  const secondTurn = [1, 2, 3].reduce((current, seat) => discard(current, seat as 1 | 2 | 3, "hatsu"), discard(game, 0, "haku"));
  const won = apply(secondTurn, 0, PlayerAction.tsumo());
  expect(won.round.phase).toMatchObject({ type: "ended", result: { deltas: [3000, -1000, -1000, -1000] } });
});

test("子が和了すると親が下家へ移り、本場は0に戻って次局へ進む", () => {
  const game = discard(startGame({ hands: [null, null, null, TANYAO], draws: ["3p"], doraIndicators: ["ton"], initial: { honba: 3 } }), 0, "3p");
  const next = confirm(apply(game, 3, PlayerAction.ron()));
  expect(next.round.dealer).toBe(1);
  expect(next.round.roundNumber).toBe(2);
  expect(next.round.roundWind).toBe("ton");
  expect(next.round.honba).toBe(0);
  expect(next.round.phase).toMatchObject({ type: "action", seat: 1 });
  expect(next.history).toHaveLength(1);
});

test("リーチ者の和了では裏ドラがめくられ、リーチと裏ドラが点数計算に含まれる", () => {
  const game = startGame({
    hands: [null, null, null, TANYAO],
    draws: ["haku", "haku", "haku", "chun", "3p"],
    doraIndicators: ["ton", "9p", "9p", "9p", "9p"],
  });
  const northTurn = [0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "haku"), game);
  const riichi = discard(northTurn, 3, "chun", true);
  expect(riichi.round.kyotaku).toBe(1);
  const won = apply(discard(riichi, 0, "3p"), 3, PlayerAction.ron());
  const result = won.round.phase.type === "ended" ? won.round.phase.result : null;
  expect(result?.type === "win" && result.uraDoraIndicators).toHaveLength(1);
  expect(result?.type === "win" && result.scoring.yaku.map((y) => y.name)).toContain("double_riichi");
  expect(result?.type === "win" && result.scoring.yaku.map((y) => y.name)).toContain("ippatsu");
  expect(result?.type === "win" && result.deltas[3]).toBe(result?.type === "win" ? result.scoring.score.total : 0);
});

test("役のない和了形ではロンできない", () => {
  // 456p をチーした 1m2m3m 7s8s9s 2s2s 5m6m の 4m/7m 待ち: 副露形で役がないので 4m が出てもロン候補にならない
  const noYaku: readonly Tile[] = ["1m", "2m", "3m", "5p", "6p", "7s", "8s", "9s", "2s", "2s", "5m", "6m", "chun"];
  const game = startGame({ hands: [null, noYaku, null, null], draws: ["4p", "hatsu", "hatsu", "4m"], doraIndicators: ["ton"] });
  const chi = apply(discard(game, 0, "4p"), 1, PlayerAction.chi(["5p", "6p"]));
  expect(chi.round.seats[1].melds).toHaveLength(1);
  const afterChi = discard(chi, 1, "chun");
  const around = [2, 3].reduce((current, seat) => discard(current, seat as 2 | 3, "hatsu"), afterChi);
  expect(around.round.seats[0].drawnTile).toBe("4m");
  const dropped = discard(around, 0, "4m");
  // 5m6m で 4m をチーはできるが、役がないのでロンは提示されない
  expect(dropped.round.phase).toMatchObject({ type: "call", tile: "4m", ronCandidates: [] });
  const types = GameEngine.availableActions(dropped, 1).map((action) => action.type);
  expect(types).toContain("chi");
  expect(types).not.toContain("ron");
});
