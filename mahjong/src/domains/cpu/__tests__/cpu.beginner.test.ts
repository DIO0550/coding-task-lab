import { test, expect } from "vitest";

import { Cpu } from "../index.ts";
import { Game } from "../../game/index.ts";
import type { GameState } from "../../game/index.ts";
import {
  JUNK_B,
  JUNK_C,
  TENPAI_HAND,
  directView,
  discardBy,
  n,
  passAll,
  startWithOrder,
  t,
} from "./helpers.ts";

test("同シャンテンなら孤立した客風の字牌を最優先で切る", () => {
  // 234m 567p 34s 67s 99p + 孤立 sha。sha を切っても 2p を切っても 1 シャンテン
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "9p", "9p", "sha"],
      TENPAI_HAND,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["2p"],
  });

  const action = Cpu.decide(Game.viewFor(state, 0), "beginner");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("sha");
  }
});

test("同シャンテンの孤立牌どうしなら幺九牌を中張牌より先に切る", () => {
  // 浮き牌は孤立 9m と孤立 5s(どちらを切っても 1 シャンテン)
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "5p", "6p", "7p", "7s", "8s", "9s", "2s", "2s", "9m", "5s"],
      TENPAI_HAND,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["1p"],
  });

  const action = Cpu.decide(Game.viewFor(state, 0), "beginner");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("9m");
  }
});

test("字牌でも対子はシャンテンを守るため切らない(打牌後シャンテン最小を選ぶ)", () => {
  // nan 対子は雀頭候補。切るとシャンテンが悪化するので浮き牌 9m を切る
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "nan", "nan", "9m"],
      TENPAI_HAND,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["1p"],
  });

  const action = Cpu.decide(Game.viewFor(state, 0), "beginner");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("9m");
  }
});

test("テンパイしてリーチが可能なら必ずリーチを宣言する", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_B, JUNK_C, ["1m", "8m", "9m", "2p", "3p", "8p", "1s", "2s", "3s", "ton", "nan", "sha", "pei"]],
    draws: ["hatsu"],
  });
  const view = Game.viewFor(state, 0);

  expect(view.legalActions.map((action) => action.type)).toContain("riichi");
  expect(Cpu.decide(view, "beginner").type).toBe("riichi");
});

test("待ちが全て見えていてもテンパイなら常にリーチを宣言する", () => {
  // haku 単騎テンパイ。haku も ton も残り0枚だが入門はリーチする
  const view = directView({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s", "8s", "haku"],
    drawn: "ton",
    discards: {
      1: ["haku", "ton"],
      2: ["haku", "ton"],
      3: ["haku", "ton"],
    },
  });

  expect(Cpu.decide(view, "beginner").type).toBe("riichi");
});

/** seat1 が haku を打ち、seat0(入門)にポンの機会がある局面を作る */
const setupHakuPonChance = (seat0Hand: readonly string[]): GameState => {
  const state = startWithOrder({
    hands: [
      seat0Hand,
      ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "haku", "pei"],
      ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "4s", "7s", "ton", "nan", "sha", "pei"],
      ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "ton", "nan", "sha", "pei"],
    ],
    draws: ["ton", "chun"],
  });
  const afterSeat0 = discardBy(state, 0, "ton");
  return Game.apply(afterSeat0, 1, { type: "discard", tile: t("haku") });
};

test("役牌の対子はシャンテンが進むならポンする", () => {
  // 99s が雀頭にあるため haku ポンでテンパイに進む
  const state = setupHakuPonChance(
    ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "9s", "9s", "haku", "haku", "9m"],
  );
  const view = Game.viewFor(state, 0);

  const action = Cpu.decide(view, "beginner");

  expect(action.type).toBe("pon");
});

test("役牌でもシャンテンが進まないポンはしない", () => {
  // haku 対子が唯一の雀頭候補。ポンしてもシャンテンは進まないのでパスする
  const state = setupHakuPonChance(
    ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "haku", "haku", "9m"],
  );
  const view = Game.viewFor(state, 0);

  expect(view.legalActions.map((action) => action.type)).toContain("pon");
  expect(Cpu.decide(view, "beginner")).toEqual({ type: "pass" });
});

test("シャンテンが進んでも役に絡まないチーはしない", () => {
  // 全て中張のタンヤオ手でも入門はチーせずパスする
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "7m", "8m", "5p", "6p", "8p", "2s", "2s", "6s", "7s", "8s"],
      ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"],
      JUNK_B,
      JUNK_C,
    ],
    draws: ["ton", "sha", "hatsu", "9m"],
  });
  const afterTurn0 = discardBy(discardBy(discardBy(state, 0, "ton"), 1, "pei"), 2, "chun");
  const chanceState = Game.apply(afterTurn0, 3, { type: "discard", tile: t("4p") });
  const view = Game.viewFor(chanceState, 0);

  expect(view.legalActions.map((action) => action.type)).toContain("chi");
  expect(Cpu.decide(view, "beginner")).toEqual({ type: "pass" });
});

test("他家リーチ中でも現物ではなく自分の牌効率で切る(押し引きを考慮しない)", () => {
  // seat1 のリーチ現物は nan(対子)だが、入門は浮き牌 9m を切る
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "nan", "nan", "9m"],
      TENPAI_HAND,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["ton", "nan", "hatsu", "chun", "1p"],
  });
  const afterSeat0 = discardBy(state, 0, "ton");
  const declared = passAll(
    Game.apply(afterSeat0, 1, { type: "riichi", tile: t("nan") }),
  );
  const backToSeat0 = discardBy(discardBy(declared, 2, "hatsu"), 3, "chun");
  const view = Game.viewFor(backToSeat0, 0);

  expect(view.players[1].riichi).not.toBe("none");
  const action = Cpu.decide(view, "beginner");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("9m");
  }
});
