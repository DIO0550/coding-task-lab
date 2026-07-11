import { test, expect } from "vitest";

import { Game } from "../index.ts";
import type { GameState } from "../index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  actionTypes,
  n,
  startWithOrder,
  t,
  tsumogiri,
  tsumogiriTimes,
} from "./helpers.ts";

/** 5m/8m 待ちの面前テンパイ(234m 456p 789s 55s + 67m) */
const TENPAI_HAND = ["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "5s", "5s", "6m", "7m"];

/** 親がテンパイ手、他3家は捨て牌専用の手で開始する */
const setupRiichiTable = (draws: readonly string[]): GameState =>
  startWithOrder({
    hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
    draws,
  });

test("リーチ宣言で供託が1増え持ち点が1000減る", () => {
  const state = setupRiichiTable(["ton", "1p", "2s", "8p", "nan"]);
  const beforeRiichi = tsumogiriTimes(state, 4);

  const after = Game.apply(beforeRiichi, 0, { type: "riichi", tile: t("nan") });

  expect(after.riichiSticks).toBe(1);
  expect(after.players[0].points).toBe(24000);
  expect(after.players[0].riichi).toBe("riichi");
  expect(after.players[0].ippatsu).toBe(true);
  expect(after.players[0].discards.at(-1)).toMatchObject({
    riichiDeclare: true,
  });
});

test("第一巡の鳴きなしリーチはダブルリーチになる", () => {
  const state = setupRiichiTable(["ton"]);

  const after = Game.apply(state, 0, { type: "riichi", tile: t("ton") });

  expect(after.players[0].riichi).toBe("double");
});

test("リーチ後の合法手はツモ切りに制限される", () => {
  const state = setupRiichiTable(["ton", "1p", "2s", "8p", "nan", "1s", "4p", "9m", "sha"]);
  const declared = Game.apply(tsumogiriTimes(state, 4), 0, {
    type: "riichi",
    tile: t("nan"),
  });
  const backToDealer = tsumogiriTimes(declared, 3);

  const actions = Game.legalActions(backToDealer, 0);

  expect(actions).toHaveLength(1);
  const only = actions[0];
  expect(only.type).toBe("discard");
  if (only.type === "discard") {
    expect(n(only.tile)).toBe("sha");
  }
});

test("リーチ後に一発でツモ和了すると一発とリーチが役に付く", () => {
  const state = setupRiichiTable(["ton", "1p", "2s", "8p", "nan", "1s", "4p", "9m", "5m"]);
  const declared = Game.apply(tsumogiriTimes(state, 4), 0, {
    type: "riichi",
    tile: t("nan"),
  });
  const backToDealer = tsumogiriTimes(declared, 3);

  expect(actionTypes(Game.legalActions(backToDealer, 0))).toContain("tsumo");
  const won = Game.apply(backToDealer, 0, { type: "tsumo" });

  expect(won.phase).toBe("result_win");
  const result = won.result;
  if (result?.kind !== "win" || !result.score.valid) {
    throw new Error("expected a valid win result");
  }
  const names = result.score.yaku.map((yaku) => yaku.name);
  expect(names).toContain("riichi");
  expect(names).toContain("ippatsu");
  expect(names).toContain("menzen_tsumo");
});

test("リーチ後の自分の打牌で一発権は消える", () => {
  const state = setupRiichiTable(["ton", "1p", "2s", "8p", "nan", "1s", "4p", "9m", "sha"]);
  const declared = Game.apply(tsumogiriTimes(state, 4), 0, {
    type: "riichi",
    tile: t("nan"),
  });
  const backToDealer = tsumogiriTimes(declared, 3);

  const after = tsumogiri(backToDealer);

  expect(after.players[0].ippatsu).toBe(false);
  expect(after.players[0].riichi).toBe("riichi");
});

test("持ち点1000未満ではリーチを宣言できない", () => {
  const state = startWithOrder(
    {
      hands: [TENPAI_HAND, JUNK_A, JUNK_B, JUNK_C],
      draws: ["ton"],
    },
    { startingPoints: 900 },
  );

  expect(actionTypes(Game.legalActions(state, 0))).not.toContain("riichi");
});

test("残り山が4枚未満ではリーチを宣言できない", () => {
  const state = setupRiichiTable(["ton"]);
  const lowWall: GameState = {
    ...state,
    wall: { ...state.wall, drawPile: state.wall.drawPile.slice(0, 3) },
  };

  expect(actionTypes(Game.legalActions(lowWall, 0))).not.toContain("riichi");
});

test("テンパイしていなければリーチを宣言できない", () => {
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, JUNK_C, TENPAI_HAND],
    draws: ["5m"],
  });

  expect(actionTypes(Game.legalActions(state, 0))).not.toContain("riichi");
});
