import { expect, test } from "vitest";

import type { PlayerView } from "../../../view/index.ts";
import {
  choiceOf,
  handOf,
  riichiOf,
  riverOf,
  riversOf,
  tilesOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { DiscardChoice } from "../index.ts";

const advancedChoice = (view: PlayerView): string =>
  choiceOf(view, DiscardChoice.choose(view, "advanced", TableInfo.create(view)));

test("上級CPUは他家リーチ中に手が悪ければ現物を切って降りる", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 4p 5p 6p 2s 4s 7s 9s 9p ton nan"),
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("9p") }),
  });

  expect(advancedChoice(view)).toBe("discard:9p");
});

test("上級CPUは降りるとき現物が無ければ最も危険度の低い牌を切る", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 4p 5p 6p 2s 4s 7s 9s 9p ton nan"),
    riichi: riichiOf([1]),
    rivers: riversOf({
      0: riverOf("nan nan"),
      1: riverOf("1s 3s"),
      2: riverOf("nan"),
    }),
  });

  expect(advancedChoice(view)).toBe("discard:nan");
});

test("上級CPUは他家リーチ中でもテンパイなら手を進める牌を切る", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 9p 9p 7s 8s 9s ton"),
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("9p") }),
  });

  expect(advancedChoice(view)).toBe("discard:ton");
});

test("上級CPUは他家のリーチが無ければ打点になるドラを残して切る", () => {
  const view = viewOf({
    hand: handOf("2s 3s 4s 6s 7s 8s chun chun chun ton ton ton 5m 5p"),
    doraIndicators: tilesOf("4p"),
  });

  expect(advancedChoice(view)).toBe("discard:5m");
});
