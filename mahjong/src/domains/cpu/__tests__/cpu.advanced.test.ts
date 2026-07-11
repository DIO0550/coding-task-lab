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

test("他家リーチ中にノーテンなら現物を切ってベタ降りする", () => {
  // seat1 のリーチ宣言牌 nan が現物(対子)。切ると 2 シャンテンでも降りる
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

  const action = Cpu.decide(view, "advanced");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("nan");
  }
});

test("現物が無ければリーチ者の河のスジ牌を選んで降りる", () => {
  // seat1 が 6s 切りリーチ。手に現物は無く、スジの 9s が最も安全
  const view = directView({
    hand: ["4m", "5m", "6m", "2p", "3p", "7p", "8p", "3s", "4s", "7s", "7s", "5p", "9s"],
    drawn: "ton",
    discards: { 1: ["6s"] },
    riichiSeats: [1],
  });

  const action = Cpu.decide(view, "advanced");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("9s");
  }
});

/** seat1 リーチに対し seat0(上級)がテンパイで押し引きを判断する局面 */
const setupPushOrFold = (doraIndicator: string): GameState => {
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "8s", "8s", "nan", "nan"],
      TENPAI_HAND,
      JUNK_B,
      ["1m", "9m", "1p", "2p", "7p", "9p", "2s", "3s", "9s", "pei", "sha", "chun", "haku"],
    ],
    draws: ["ton", "nan", "hatsu", "chun", "7p"],
    doraIndicators: [doraIndicator],
  });
  const afterSeat0 = discardBy(state, 0, "ton");
  const declared = passAll(
    Game.apply(afterSeat0, 1, { type: "riichi", tile: t("nan") }),
  );
  return discardBy(discardBy(declared, 2, "hatsu"), 3, "chun");
};

test("他家リーチ中でもテンパイかつ十分な打点(ドラ)があれば押してリーチする", () => {
  // ドラ表示 7s → 8s が3枚ドラ。テンパイ+高打点なので降りない
  const state = setupPushOrFold("7s");
  const view = Game.viewFor(state, 0);

  const action = Cpu.decide(view, "advanced");

  expect(action.type).toBe("riichi");
});

test("他家リーチ中はテンパイでも打点が無ければ現物で降りる", () => {
  // ドラ無しの安手。同じテンパイ形でも現物 nan を切って降りる
  const state = setupPushOrFold("haku");
  const view = Game.viewFor(state, 0);

  const action = Cpu.decide(view, "advanced");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("nan");
  }
});

test("受け入れが同じならドラを手に残す打牌を選ぶ(打点効率)", () => {
  // 孤立字牌 nan(ドラ)と sha。上級はドラの nan を残して sha を切る
  const view = directView({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s", "8s", "8s", "nan", "sha"],
    drawn: "6m",
    doraIndicators: ["ton"],
  });

  const action = Cpu.decide(view, "advanced");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("sha");
  }
});
