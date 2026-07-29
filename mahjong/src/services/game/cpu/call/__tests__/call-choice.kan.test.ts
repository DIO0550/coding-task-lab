import { expect, test } from "vitest";

import { GameAction } from "../../../action/index.ts";
import type { PlayerView } from "../../../view/index.ts";
import {
  choiceOf,
  discardActions,
  handOf,
  riichiOf,
  tileOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { CallChoice } from "../index.ts";

const kanChoice = (view: PlayerView): string =>
  choiceOf(view, CallChoice.chooseKan(view, "standard", TableInfo.create(view)));

test("シャンテン数が悪くならない暗槓は行う", () => {
  const hand = handOf("1m 2m 3m 4m 5p 6p 7p 2s 3s 9s chun chun chun chun");
  const view = viewOf({
    hand,
    actions: [...discardActions(hand), GameAction.ankan(tileOf("chun"))],
  });

  expect(kanChoice(view)).toBe("ankan");
});

test("シャンテン数が悪くなる暗槓はしない", () => {
  const hand = handOf("3m 4m 5m 5m 5m 5m 6m 7m 1p 2p 3p 4p ton ton");
  const view = viewOf({
    hand,
    actions: [...discardActions(hand), GameAction.ankan(tileOf("5m"))],
  });

  expect(kanChoice(view)).toBe("none");
});

test("他家リーチ中にテンパイしていなければ槓しない", () => {
  const hand = handOf("1m 2m 3m 4m 5p 6p 7p 2s 3s 9s chun chun chun chun");
  const view = viewOf({
    hand,
    riichi: riichiOf([1]),
    actions: [...discardActions(hand), GameAction.ankan(tileOf("chun"))],
  });

  expect(kanChoice(view)).toBe("none");
});

test("槓が選べなければ槓しない", () => {
  const hand = handOf("1m 2m 3m 4m 5p 6p 7p 2s 3s 9s chun chun nan sha");
  const view = viewOf({ hand, actions: discardActions(hand) });

  expect(kanChoice(view)).toBe("none");
});
