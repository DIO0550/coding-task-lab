import { test, expect } from "vitest";

import { Cpu } from "../index.ts";
import { Game } from "../../game/index.ts";
import { Hand } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { PlayerView } from "../../game/index.ts";
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

/** view の自手(手牌+ツモ牌) */
const concealedOf = (view: PlayerView): readonly Tile[] =>
  view.drawn === null ? view.hand : [...view.hand, view.drawn];

/** view から見える全ての牌(自手・河・副露・ドラ表示牌) */
const visibleOf = (view: PlayerView): readonly Tile[] => [
  ...concealedOf(view),
  ...view.doraIndicators,
  ...view.players.flatMap((player) => [
    ...player.discards
      .filter((discard) => discard.calledBy === null)
      .map((discard) => discard.tile),
    ...player.melds.flatMap((called) => called.meld.tiles),
  ]),
];

/** 打牌後の残り手牌 */
const restAfter = (view: PlayerView, tile: Tile): readonly Tile[] => {
  const concealed = concealedOf(view);
  const index = concealed.findIndex((item) => Tile.equalsExact(item, tile));
  return [...concealed.slice(0, index), ...concealed.slice(index + 1)];
};

/** 受け入れ枚数(シャンテンが進む牌の未見枚数合計)をテスト側でも算出する */
const acceptanceSumOf = (view: PlayerView, rest: readonly Tile[]): number => {
  const visible = visibleOf(view);
  return Hand.acceptances(rest, view.melds.length).reduce(
    (sum, tile) =>
      sum +
      Math.max(
        0,
        4 - visible.filter((seen) => Tile.equals(seen, tile)).length,
      ),
    0,
  );
};

/** 234m 78m 567p 45s 7s 999s の 1 シャンテン(打牌の選択肢が多い形) */
const setupEfficiencyView = (): PlayerView => {
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "7m", "8m", "5p", "6p", "7p", "4s", "5s", "7s", "9s", "9s"],
      TENPAI_HAND,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["9s"],
    doraIndicators: ["1p"],
  });
  return Game.viewFor(state, 0);
};

test("打牌でシャンテン数を悪化させない(打牌後シャンテン最小の牌を選ぶ)", () => {
  const view = setupEfficiencyView();

  const action = Cpu.decide(view, "standard");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    const shantens = view.legalActions.flatMap((candidate) =>
      candidate.type === "discard"
        ? [Hand.shanten(restAfter(view, candidate.tile), view.melds.length)]
        : [],
    );
    const chosen = Hand.shanten(restAfter(view, action.tile), view.melds.length);
    expect(chosen).toBe(Math.min(...shantens));
  }
});

test("最小シャンテンの打牌のうち受け入れ枚数が最大の牌を選ぶ", () => {
  const view = setupEfficiencyView();

  const action = Cpu.decide(view, "standard");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    const candidates = view.legalActions.flatMap((candidate) =>
      candidate.type === "discard" ? [restAfter(view, candidate.tile)] : [],
    );
    const minShanten = Math.min(
      ...candidates.map((rest) => Hand.shanten(rest, view.melds.length)),
    );
    const bestSum = Math.max(
      ...candidates
        .filter((rest) => Hand.shanten(rest, view.melds.length) === minShanten)
        .map((rest) => acceptanceSumOf(view, rest)),
    );
    const chosenRest = restAfter(view, action.tile);
    expect(acceptanceSumOf(view, chosenRest)).toBe(bestSum);
    // 受け入れ最大(28枚)になるのは 4s 切りと 7s 切りだけ(実測値)
    expect(["4s", "7s"]).toContain(n(action.tile));
  }
});

test("テンパイして待ちが生きていればリーチを宣言する", () => {
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_B, JUNK_C, ["1m", "8m", "9m", "2p", "3p", "8p", "1s", "2s", "3s", "ton", "nan", "sha", "pei"]],
    draws: ["hatsu"],
  });
  const view = Game.viewFor(state, 0);

  expect(Cpu.decide(view, "standard").type).toBe("riichi");
});

test("待ちが全て見えているテンパイではリーチを宣言しない", () => {
  // haku 単騎・ton 単騎への手替わりのどちらも残り0枚
  const view = directView({
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s", "8s", "haku"],
    drawn: "ton",
    discards: {
      1: ["haku", "ton"],
      2: ["haku", "ton"],
      3: ["haku", "ton"],
    },
  });

  expect(view.legalActions.map((action) => action.type)).toContain("riichi");
  expect(Cpu.decide(view, "standard").type).toBe("discard");
});

test("他家リーチ中は現物があればシャンテンを崩してでも現物を切る", () => {
  // seat1 のリーチ宣言牌 nan が現物。nan は対子で、切ると 2 シャンテンに落ちる
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
  const action = Cpu.decide(view, "standard");

  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    expect(n(action.tile)).toBe("nan");
  }
});

test("タンヤオが見込めてテンパイに進むチーは鳴く", () => {
  // 全て中張の 1 シャンテン。4p チーで喰いタンのテンパイになる
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

  const action = Cpu.decide(view, "standard");

  expect(action.type).toBe("chi");
  if (action.type === "chi") {
    expect(action.tiles.map(n).toSorted()).toEqual(["5p", "6p"]);
  }
});

test("シャンテンが進んでも役が見込めない鳴きはしない", () => {
  // 123m 789p と字牌を含む手。2s チーはタンヤオ・役牌・混一のどれも残らない
  const state = startWithOrder({
    hands: [
      ["1m", "2m", "3m", "7p", "8p", "9p", "3s", "4s", "9s", "9s", "nan", "sha", "7m"],
      ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"],
      JUNK_B,
      JUNK_C,
    ],
    draws: ["ton", "haku", "hatsu", "6m"],
  });
  const afterTurn0 = discardBy(discardBy(discardBy(state, 0, "ton"), 1, "pei"), 2, "chun");
  const chanceState = Game.apply(afterTurn0, 3, { type: "discard", tile: t("2s") });
  const view = Game.viewFor(chanceState, 0);

  expect(view.legalActions.map((action) => action.type)).toContain("chi");
  expect(Cpu.decide(view, "standard")).toEqual({ type: "pass" });
});
