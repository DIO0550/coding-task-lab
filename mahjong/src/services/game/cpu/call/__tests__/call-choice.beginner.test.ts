import { expect, test } from "vitest";

import { GameAction } from "../../../action/index.ts";
import type { PlayerView } from "../../../view/index.ts";
import {
  choiceOf,
  claimOf,
  handOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { CallChoice } from "../index.ts";

const beginnerCall = (view: PlayerView): string =>
  choiceOf(view, CallChoice.chooseClaim(view, "beginner", TableInfo.create(view)));

test("入門CPUは役牌が出たらポンする", () => {
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

  expect(beginnerCall(view)).toBe("pon");
});

test("入門CPUは役牌以外の牌はポンしない", () => {
  const hand = handOf("2m 3m 4m 5m 5m 5p 6p 7p 2s 3s 4s 1m 9s");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 1,
    claim: claimOf("5m", 1),
    actions: [GameAction.pon(handOf("5m 5m").concealed), GameAction.pass()],
  });

  expect(beginnerCall(view)).toBe("none");
});

test("入門CPUは手が進むチーでも鳴かない", () => {
  const hand = handOf("2m 3m 4p 5p 6p 2s 3s 4s 6s 7s 8s 5m 7p");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 3,
    claim: claimOf("4m", 3),
    actions: [GameAction.chi(handOf("2m 3m").concealed), GameAction.pass()],
  });

  expect(beginnerCall(view)).toBe("none");
});
