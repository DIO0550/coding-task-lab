import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import type { CpuLevel } from "@/src/domains/game";
import { Cpu } from "../index";
import { discardEntry, setupView, turnActions } from "./helpers";

const LEVELS: readonly CpuLevel[] = ["beginner", "standard", "advanced"];

/** ばらばらの配牌(2シャンテン以上) */
const scatteredHand: readonly Tile[] = [
  "1m",
  "2m",
  "9m",
  "1p",
  "5p",
  "9p",
  "2s",
  "6s",
  "9s",
  "ton",
  "nan",
  "haku",
  "chun",
];

/** 123456789m + 2s2s + 5p5p(9s ツモでリーチ可能) */
const tenpaiHand: readonly Tile[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "2s",
  "2s",
  "5p",
  "5p",
];

test("各レベルとも合法な打牌(選択肢に含まれる牌)を返す", () => {
  for (const level of LEVELS) {
    const view = setupView({ ownHand: scatteredHand, ownDrawn: "3p" });
    const actions = turnActions([...scatteredHand, "3p"]);
    const action = Cpu.decideTurn(view, actions, level);
    expect(action.type).toBe("discard");
    if (action.type === "discard") {
      expect(actions.discards).toContain(action.tile);
      expect(action.player).toBe(view.seat);
    }
  }
});

test("ツモ和了できるときは各レベルとも必ずツモを宣言する", () => {
  for (const level of LEVELS) {
    const view = setupView({ ownHand: tenpaiHand, ownDrawn: "5p" });
    const actions = turnActions([...tenpaiHand, "5p"], { canTsumo: true });
    expect(Cpu.decideTurn(view, actions, level)).toStrictEqual({
      type: "tsumo",
      player: view.seat,
    });
  }
});

test("入門はリーチ可能なら必ずリーチ宣言する", () => {
  const view = setupView({ ownHand: tenpaiHand, ownDrawn: "9s" });
  const actions = turnActions([...tenpaiHand, "9s"], {
    canRiichi: true,
    riichiDiscards: ["9s"],
  });
  expect(Cpu.decideTurn(view, actions, "beginner")).toStrictEqual({
    type: "discard",
    player: view.seat,
    tile: "9s",
    riichi: true,
  });
});

test("リーチ後はツモ切りする", () => {
  for (const level of LEVELS) {
    const view = setupView({
      ownHand: tenpaiHand,
      ownDrawn: "7p",
      ownRiichi: "riichi",
    });
    const actions = turnActions(["7p"]);
    expect(Cpu.decideTurn(view, actions, level)).toStrictEqual({
      type: "discard",
      player: view.seat,
      tile: "7p",
      riichi: false,
    });
  }
});

test("標準は他家リーチ時に2シャンテン以上なら現物を切って降りる", () => {
  const view = setupView({
    ownHand: scatteredHand,
    ownDrawn: "3p",
    others: {
      3: {
        riichi: "riichi",
        discards: [discardEntry("9p"), discardEntry("2s")],
      },
    },
  });
  const actions = turnActions([...scatteredHand, "3p"]);
  const action = Cpu.decideTurn(view, actions, "standard");
  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    // リーチ者の河にある牌(現物)を選ぶ
    expect(["9p", "2s"]).toContain(action.tile);
  }
});

test("入門は他家リーチでも降りずに牌効率で打牌する", () => {
  const view = setupView({
    ownHand: scatteredHand,
    ownDrawn: "3p",
    others: {
      3: { riichi: "riichi", discards: [discardEntry("9p")] },
    },
  });
  const actions = turnActions([...scatteredHand, "3p"]);
  const action = Cpu.decideTurn(view, actions, "beginner");
  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    // 現物の 9p はシャンテン数を悪化させるため、押し引きを考えない入門は選ばない
    expect(action.tile).not.toBe("9p");
  }
});

test("入門はシャンテン数が同じ打牌候補から字牌を優先して切る", () => {
  // 456m 456p 456s 8s8s + 浮き牌 haku / 9m / 1p: どれを切ってもシャンテン数は
  // 変わらないため、字牌の haku から切る
  const hand: readonly Tile[] = [
    "4m",
    "5m",
    "6m",
    "4p",
    "5p",
    "6p",
    "4s",
    "5s",
    "6s",
    "8s",
    "8s",
    "haku",
    "9m",
  ];
  const view = setupView({ ownHand: hand, ownDrawn: "1p" });
  const actions = turnActions([...hand, "1p"]);
  const action = Cpu.decideTurn(view, actions, "beginner");
  expect(action).toStrictEqual({
    type: "discard",
    player: view.seat,
    tile: "haku",
    riichi: false,
  });
});
