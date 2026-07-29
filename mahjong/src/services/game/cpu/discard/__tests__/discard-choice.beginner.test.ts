import { expect, test } from "vitest";

import type { PlayerView } from "../../../view/index.ts";
import {
  choiceOf,
  handOf,
  riichiOf,
  riverOf,
  riversOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { DiscardChoice } from "../index.ts";

const beginnerChoice = (view: PlayerView): string =>
  choiceOf(view, DiscardChoice.choose(view, "beginner", TableInfo.create(view)));

test("入門CPUは孤立した字牌から切る", () => {
  const view = viewOf({
    hand: handOf("2m 3m 4m 5m 6m 7m 3p 4p 5p 6s 7s 8s 1p nan"),
  });

  expect(beginnerChoice(view)).toBe("discard:nan");
});

test("入門CPUは孤立した字牌のうち役に関係しない客風から切る", () => {
  const view = viewOf({
    hand: handOf("2m 3m 4m 5m 6m 7m 3p 4p 5p 6s 7s 8s chun nan"),
  });

  expect(beginnerChoice(view)).toBe("discard:nan");
});

test("入門CPUは孤立した字牌が無ければ孤立した么九牌から切る", () => {
  const view = viewOf({
    hand: handOf("2m 3m 4m 5m 6m 7m 3p 4p 5p 8s 8s 8s 9p 5s"),
  });

  expect(beginnerChoice(view)).toBe("discard:9p");
});

test("入門CPUは孤立牌を切るとシャンテン数が悪化するなら他の牌を切る", () => {
  const view = viewOf({
    hand: handOf("2m 3m 4m 5m 6m 7m 3p 4p 5p 6s 7s nan nan 1m"),
  });

  expect(beginnerChoice(view)).toBe("discard:1m");
});

test("入門CPUは他家がリーチしていても現物かどうかを考えない", () => {
  const view = viewOf({
    hand: handOf("2m 3m 4m 5m 6m 7m 3p 4p 5p 6s 7s 8s 1p nan"),
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("1p") }),
  });

  expect(beginnerChoice(view)).toBe("discard:nan");
});
