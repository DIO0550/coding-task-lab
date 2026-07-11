import { test, expect } from "vitest";

import { Cpu } from "../index.ts";
import { Game } from "../../game/index.ts";
import type { CpuLevel, GameState, Seat } from "../../game/index.ts";
import { Random } from "../../../libs/random/index.ts";
import {
  JUNK_B,
  JUNK_C,
  TENPAI_HAND,
  cpuPlayers,
  defaultRule,
  discardBy,
  startWithOrder,
  t,
} from "./helpers.ts";

const LEVELS: readonly CpuLevel[] = ["beginner", "standard", "advanced"];

/** 捨て牌専用の手(seat1 用。TENPAI_HAND と枚数が競合しない) */
const JUNK_FOR_SEAT1: readonly string[] = ["1m", "8m", "9m", "2p", "3p", "8p", "1s", "2s", "3s", "ton", "nan", "sha", "pei"];

test("ツモ和了できる局面では全レベルがツモを宣言する", () => {
  // 親(seat0)がテンパイ配牌から和了牌 5m を第1ツモする(平和・ツモ)
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_FOR_SEAT1, JUNK_B, JUNK_C],
    draws: ["5m"],
  });
  const view = Game.viewFor(state, 0);

  expect(view.legalActions.map((action) => action.type)).toContain("tsumo");
  for (const level of LEVELS) {
    expect(Cpu.decide(view, level)).toEqual({ type: "tsumo" });
  }
});

test("ロン和了できる局面では全レベルがロンを宣言する", () => {
  // seat1 がテンパイ(5m/8m 待ち平和形)、seat0 が 5m を打つ
  const state = startWithOrder({
    hands: [
      ["1m", "5m", "9m", "2p", "3p", "8p", "1s", "2s", "3s", "ton", "nan", "sha", "pei"],
      TENPAI_HAND,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["hatsu"],
  });
  const afterDiscard = Game.apply(state, 0, { type: "discard", tile: t("5m") });
  const view = Game.viewFor(afterDiscard, 1);

  expect(view.legalActions.map((action) => action.type)).toContain("ron");
  for (const level of LEVELS) {
    expect(Cpu.decide(view, level)).toEqual({ type: "ron" });
  }
});

test("リーチ後のツモ切りしかない局面ではその1手を返す", () => {
  // seat0 がリーチ後、次巡に和了牌でない sha をツモする
  const state = startWithOrder({
    hands: [TENPAI_HAND, JUNK_FOR_SEAT1, JUNK_B, JUNK_C],
    draws: ["hatsu", "1p", "4s", "6p", "sha"],
  });
  const declared = discardBy(
    Game.apply(state, 0, { type: "riichi", tile: t("hatsu") }),
    1,
    "1p",
  );
  const backToDealer = discardBy(discardBy(declared, 2, "4s"), 3, "6p");
  const view = Game.viewFor(backToDealer, 0);

  expect(view.legalActions).toHaveLength(1);
  for (const level of LEVELS) {
    expect(Cpu.decide(view, level)).toBe(view.legalActions[0]);
  }
});

test("同じ view と level には常に同じ行動を返す", () => {
  const state = startWithOrder({
    hands: [
      ["2m", "3m", "4m", "5p", "6p", "7p", "3s", "4s", "6s", "7s", "nan", "nan", "9m"],
      JUNK_FOR_SEAT1,
      JUNK_B,
      JUNK_C,
    ],
    draws: ["1p"],
  });
  const view = Game.viewFor(state, 0);

  for (const level of LEVELS) {
    const first = Cpu.decide(view, level);
    expect(Cpu.decide(view, level)).toEqual(first);
    expect(Cpu.decide(view, level)).toEqual(first);
    expect(view.legalActions).toContain(first);
  }
});

const levelOf = (state: GameState, seat: Seat): CpuLevel =>
  state.players[seat].config.level ?? "standard";

/** CPU だけで対局を最後まで進める。全行動が legalActions に含まれることを検証する */
const runFullGame = (seed: number): GameState => {
  let state = Game.start(
    defaultRule({ format: "tonpuu" }),
    cpuPlayers(),
    Random.seeded(seed),
  );
  for (let step = 0; step < 5000; step += 1) {
    if (Game.isFinished(state)) {
      return state;
    }
    const actor = Game.currentActor(state);
    if (actor === null) {
      state = Game.confirmResult(state);
      continue;
    }
    const view = Game.viewFor(state, actor);
    const action = Cpu.decide(view, levelOf(state, actor));
    expect(view.legalActions).toContain(action);
    const next = Game.apply(state, actor, action);
    if (next === state) {
      throw new Error(
        `action was rejected by the engine: seat=${actor} type=${action.type}`,
      );
    }
    state = next;
  }
  throw new Error("game did not finish within the step limit");
};

test(
  "CPU だけで東風戦を開始から終局まで自動でプレイできる",
  () => {
    const finished = runFullGame(42);

    expect(Game.isFinished(finished)).toBe(true);
    expect(Game.ranking(finished)).toHaveLength(4);
  },
  20000,
);

test(
  "同じ seed の対局は同じ結果になる(対局全体の決定性)",
  () => {
    const first = runFullGame(7);
    const second = runFullGame(7);

    expect(second.players.map((player) => player.points)).toEqual(
      first.players.map((player) => player.points),
    );
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  },
  40000,
);
