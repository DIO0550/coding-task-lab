import { test, expect } from "vitest";

import { Game } from "../index.ts";
import type { GameState } from "../index.ts";
import { Random } from "../../../libs/random/index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  defaultRule,
  fourPlayers,
  runToExhaustion,
  startWithOrder,
  t,
  tsumogiriTimes,
} from "./helpers.ts";

/** 2s/5s 待ちのタンヤオ・ピンフ確定テンパイ */
const TANYAO_WAIT = ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8p", "8p", "3s", "4s"];
/** 5m/8m 待ちの面前テンパイ */
const TENPAI_HAND = ["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "5s", "5s", "6m", "7m"];

/** 親(seat0)が seat1 の放銃で和了った result_win 状態を作る */
const dealerWinState = (): GameState => {
  const state = startWithOrder({
    hands: [TANYAO_WAIT, JUNK_A, JUNK_B, JUNK_C],
    draws: ["9m", "5s"],
    doraIndicators: ["ton"],
  });
  const passed = tsumogiriTimes(state, 1);
  const responding = Game.apply(passed, 1, { type: "discard", tile: t("5s") });
  return Game.apply(responding, 0, { type: "ron" });
};

/** 子(seat2)が親の放銃で和了った result_win 状態を作る */
const childWinState = (rule?: Parameters<typeof startWithOrder>[1]): GameState => {
  const state = startWithOrder(
    {
      hands: [JUNK_A, JUNK_B, TANYAO_WAIT, JUNK_C],
      draws: ["5s"],
      doraIndicators: ["ton"],
    },
    rule,
  );
  const responding = Game.apply(state, 0, { type: "discard", tile: t("5s") });
  return Game.apply(responding, 2, { type: "ron" });
};

test("親が和了ると連荘して本場が1増える", () => {
  const confirmed = Game.confirmResult(dealerWinState());

  expect(confirmed.dealer).toBe(0);
  expect(confirmed.roundWind).toBe("ton");
  expect(confirmed.roundNumber).toBe(1);
  expect(confirmed.honba).toBe(1);
  expect(confirmed.phase).toBe("action");
});

test("子が和了ると親が下家へ移り本場が0に戻って次局へ進む", () => {
  const withHonba: GameState = { ...childWinState(), honba: 3 };

  const confirmed = Game.confirmResult(withHonba);

  expect(confirmed.dealer).toBe(1);
  expect(confirmed.roundNumber).toBe(2);
  expect(confirmed.roundWind).toBe("ton");
  expect(confirmed.honba).toBe(0);
  expect(confirmed.phase).toBe("action");
});

test("次局は配牌からやり直され前局の手牌・河・リーチは持ち越されない", () => {
  const confirmed = Game.confirmResult(dealerWinState());

  for (const player of confirmed.players) {
    expect(player.melds).toEqual([]);
    expect(player.discards).toEqual([]);
    expect(player.riichi).toBe("none");
    expect(player.hand).toHaveLength(13);
  }
  expect(confirmed.players[confirmed.dealer].drawn).not.toBeNull();
  expect(Game.viewFor(confirmed, 0).wallRemaining).toBe(69);
});

test("東風戦は東4局が終わると子の和了でも終局する", () => {
  const finalRound: GameState = {
    ...childWinState({ format: "tonpuu" }),
    roundNumber: 4,
  };

  const confirmed = Game.confirmResult(finalRound);

  expect(confirmed.phase).toBe("game_end");
  expect(Game.isFinished(confirmed)).toBe(true);
});

test("東風戦の東4局は親が和了っても延長せず終局する", () => {
  const finalRound: GameState = {
    ...dealerWinState(),
    rule: defaultRule({ format: "tonpuu" }),
    roundNumber: 4,
  };

  const confirmed = Game.confirmResult(finalRound);

  expect(confirmed.phase).toBe("game_end");
});

test("半荘戦は東4局の輪荘で南入する", () => {
  const finalEast: GameState = { ...childWinState(), roundNumber: 4 };

  const confirmed = Game.confirmResult(finalEast);

  expect(confirmed.phase).toBe("action");
  expect(confirmed.roundWind).toBe("nan");
  expect(confirmed.roundNumber).toBe(1);
  expect(confirmed.dealer).toBe(1);
});

test("半荘戦は南4局が終わると終局する", () => {
  const finalRound: GameState = {
    ...childWinState(),
    roundWind: "nan",
    roundNumber: 4,
  };

  const confirmed = Game.confirmResult(finalRound);

  expect(confirmed.phase).toBe("game_end");
});

test("持ち点が0点未満になるとトビで即終局する", () => {
  const won = childWinState({ startingPoints: 1500 });

  const confirmed = Game.confirmResult(won);

  expect(confirmed.players[0].points).toBe(-500);
  expect(confirmed.phase).toBe("game_end");
  expect(Game.ranking(confirmed)[0].seat).toBe(2);
});

test("順位は素点降順で同点は起家に近い席が上位になる", () => {
  const state = Game.start(defaultRule(), fourPlayers(), Random.seeded(21));
  const adjusted: GameState = {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      points: [25000, 30000, 25000, 20000][player.seat],
    })),
  };

  const ranking = Game.ranking(adjusted);

  expect(ranking.map((entry) => entry.seat)).toEqual([1, 0, 2, 3]);
  expect(ranking.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
  expect(ranking[0].points).toBe(30000);
});

test("終局時に残っていた供託はトップが回収する", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
    draws: ["ton"],
  });
  const declared = Game.apply(state, 0, { type: "riichi", tile: t("ton") });
  const drawn = runToExhaustion(declared);
  const finalRound: GameState = {
    ...drawn,
    roundWind: "nan",
    roundNumber: 4,
  };

  const confirmed = Game.confirmResult(finalRound);

  expect(confirmed.phase).toBe("game_end");
  expect(confirmed.riichiSticks).toBe(0);
  // 親: 25000 -1000(リーチ) +3000(ノーテン罰符) +1000(供託回収) = 28000
  expect(confirmed.players[0].points).toBe(28000);
  const total = confirmed.players.reduce((sum, p) => sum + p.points, 0);
  expect(total).toBe(100000);
});

test("東風戦を最後まで進めると終局し順位が確定する", () => {
  let state = Game.start(
    defaultRule({ format: "tonpuu" }),
    fourPlayers(),
    Random.seeded(7),
  );

  for (let confirms = 0; confirms < 30 && !Game.isFinished(state); confirms += 1) {
    state = runToExhaustion(state);
    state = Game.confirmResult(state);
  }

  expect(Game.isFinished(state)).toBe(true);
  expect(state.roundWind).toBe("ton");
  const ranking = Game.ranking(state);
  expect(ranking).toHaveLength(4);
  expect(ranking.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
  expect(Game.currentActor(state)).toBeNull();
  expect(Game.legalActions(state, 0)).toEqual([]);
});
