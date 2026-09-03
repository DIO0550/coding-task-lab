import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";
import { RuleConfig } from "@/src/domains/rule-config";
import type { Tile } from "@/src/domains/tile";

import { GameEngine } from "..";

import { apply, confirm, discard, startGame, type StartOptions } from "./fixtures";

/** 断么九の 3p/6p 待ち(ロン 1翻40符) */
const TANYAO: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];

/** 親(席3)が 3p を切り、席0(子)がロンして確定するまで */
const childWins = (options: Partial<StartOptions>) => {
  const game = startGame({ hands: [TANYAO, null, null, null], draws: ["3p"], doraIndicators: ["ton"], dealer: 3, ...options });
  return confirm(apply(discard(game, 3, "3p"), 0, PlayerAction.ron()));
};

/** 親(席3)が 3p をツモ和了して確定するまで(第一ツモを避けて一巡させる) */
const dealerWins = (options: Partial<StartOptions>) => {
  const game = startGame({
    hands: [null, null, null, TANYAO],
    draws: ["haku", "hatsu", "hatsu", "hatsu", "3p"],
    doraIndicators: ["ton"],
    dealer: 3,
    ...options,
  });
  const around = [0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "hatsu"), discard(game, 3, "haku"));
  return confirm(apply(around, 3, PlayerAction.tsumo()));
};

test("東風戦は東4局で子が和了すると終局する", () => {
  const finished = childWins({ rules: { gameLength: "tonpuu" }, initial: { roundWind: "ton", roundNumber: 4 } });
  expect(finished.status).toBe("finished");
});

test("半荘戦は東4局で子が和了しても終局せず、南1局へ進む", () => {
  const next = childWins({ rules: { gameLength: "hanchan" }, initial: { roundWind: "ton", roundNumber: 4 } });
  expect(next.status).toBe("playing");
  expect(next.round.roundWind).toBe("nan");
  expect(next.round.roundNumber).toBe(1);
  expect(next.round.dealer).toBe(0);
});

test("半荘戦は南4局で子が和了すると終局する", () => {
  const finished = childWins({ rules: { gameLength: "hanchan" }, initial: { roundWind: "nan", roundNumber: 4 } });
  expect(finished.status).toBe("finished");
  expect(GameEngine.availableActions(finished, 0)).toStrictEqual([]);
});

test("最終局でも親が和了すれば連荘して対局が続く", () => {
  const next = dealerWins({ rules: { gameLength: "tonpuu" }, initial: { roundWind: "ton", roundNumber: 4 } });
  expect(next.status).toBe("playing");
  expect(next.round.roundNumber).toBe(4);
  expect(next.round.honba).toBe(1);
  expect(next.round.dealer).toBe(3);
});

test("持ち点が0点未満になるとトビで終局する", () => {
  const finished = childWins({ initial: { scores: [25000, 25000, 25000, 1000] } });
  expect(finished.scores[3]).toBe(-300);
  expect(finished.status).toBe("finished");
});

test("持ち点がちょうど0点ならトビにならない", () => {
  const next = childWins({ initial: { scores: [25000, 25000, 25000, 1300] } });
  expect(next.scores[3]).toBe(0);
  expect(next.status).toBe("playing");
});

test("順位は持ち点順で決まり、同点は起家に近い方が上位になる", () => {
  const game = startGame({ hands: [null, null, null, null], initial: { scores: [30000, 20000, 30000, 20000] } });
  expect(GameEngine.ranking(game).map((entry) => [entry.seat, entry.rank])).toStrictEqual([
    [0, 1],
    [2, 2],
    [1, 3],
    [3, 4],
  ]);
});

test("返し点30,000点ではオカを1位に加えた最終ポイントになる", () => {
  const game = startGame({ hands: [null, null, null, null], initial: { scores: [35000, 30000, 20000, 15000] } });
  expect(GameEngine.ranking(game).map((entry) => entry.points)).toStrictEqual([25, 0, -10, -15]);
});

test("返し点なしでは持ち点との差だけが最終ポイントになる", () => {
  const game = startGame({
    hands: [null, null, null, null],
    rules: RuleConfig.with(RuleConfig.default(), { returnPoints: null }),
    initial: { scores: [35000, 30000, 20000, 15000] },
  });
  expect(GameEngine.ranking(game).map((entry) => entry.points)).toStrictEqual([10, 5, -5, -10]);
});
