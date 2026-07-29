import { expect, test } from "vitest";

import type { CpuLevel } from "../../../../../domains/participant/index.ts";
import { GameAction } from "../../../action/index.ts";
import type { PlayerView } from "../../../view/index.ts";
import {
  choiceOf,
  claimOf,
  handOf,
  riichiOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { CallChoice } from "../index.ts";

const callChoice = (view: PlayerView, level: CpuLevel): string =>
  choiceOf(view, CallChoice.chooseClaim(view, level, TableInfo.create(view)));

test("標準CPUは役牌が出たらポンする", () => {
  const hand = handOf("2m 3m 4m 5p 6p 7p 2s 3s 4s haku haku 1m 9s");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 1,
    claim: claimOf("haku", 1),
    actions: [
      GameAction.pon(handOf("haku haku").concealed),
      GameAction.pass(),
    ],
  });

  expect(callChoice(view, "standard")).toBe("pon");
});

test("標準CPUはタンヤオが見込めて手が進むならチーする", () => {
  const hand = handOf("2m 3m 4p 5p 6p 2s 3s 4s 6s 7s 8s 5m 7p");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 3,
    claim: claimOf("4m", 3),
    actions: [GameAction.chi(handOf("2m 3m").concealed), GameAction.pass()],
  });

  expect(callChoice(view, "standard")).toBe("chi");
});

test("標準CPUは役が見込めない鳴きはしない", () => {
  const hand = handOf("1m 2m 5p 6p 7p 2s 3s 4s 9s 9s ton nan sha");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 3,
    claim: claimOf("3m", 3),
    actions: [GameAction.chi(handOf("1m 2m").concealed), GameAction.pass()],
  });

  expect(callChoice(view, "standard")).toBe("none");
});

test("標準CPUはシャンテン数が進まない鳴きはしない", () => {
  const hand = handOf("2m 3m 4m 4p 5p 6p 2s 3s 4s 5s 6s 8p 8p");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 1,
    claim: claimOf("8p", 1),
    actions: [GameAction.pon(handOf("8p 8p").concealed), GameAction.pass()],
  });

  expect(callChoice(view, "standard")).toBe("none");
});

test("標準CPUは他家リーチ中でも役が見込める鳴きで手を進める", () => {
  const hand = handOf("4p 5p 6p 2m 3m 2s 3s 6s 7s 5m 5m 7p 8p");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 3,
    claim: claimOf("4m", 3),
    riichi: riichiOf([1]),
    actions: [GameAction.chi(handOf("2m 3m").concealed), GameAction.pass()],
  });

  expect(callChoice(view, "standard")).toBe("chi");
});

test("上級CPUは他家リーチ中にテンパイしない鳴きはしない", () => {
  const hand = handOf("4p 5p 6p 2m 3m 2s 3s 6s 7s 5m 5m 7p 8p");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 3,
    claim: claimOf("4m", 3),
    riichi: riichiOf([1]),
    actions: [GameAction.chi(handOf("2m 3m").concealed), GameAction.pass()],
  });

  expect(callChoice(view, "advanced")).toBe("none");
});
