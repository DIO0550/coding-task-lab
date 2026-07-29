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

const standardChoice = (view: PlayerView): string =>
  choiceOf(view, DiscardChoice.choose(view, "standard", TableInfo.create(view)));

test("標準CPUは場に見えている牌を除いた受け入れが最も広くなる牌を切る", () => {
  const view = viewOf({
    hand: handOf("2m 3m 4m 8m 9m 1p 3p 6p 7p 8p 5s 6s ton ton"),
    rivers: riversOf({
      1: riverOf("2p"),
      2: riverOf("2p"),
      3: riverOf("2p"),
    }),
  });

  expect(["discard:1p", "discard:3p"]).toContain(standardChoice(view));
});

test("標準CPUは受け入れが同じならドラを残して切る", () => {
  const view = viewOf({
    hand: handOf("2s 3s 4s 6s 7s 8s chun chun chun ton ton ton 5m 5p"),
    doraIndicators: tilesOf("4p"),
  });

  expect(standardChoice(view)).toBe("discard:5m");
});

test("標準CPUは他家のリーチが無ければ受け入れを優先して切る", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 4p 5p 6p 2s 4s 7s 9s 9p ton nan"),
  });

  expect(standardChoice(view)).toBe("discard:5m");
});

test("標準CPUは他家リーチ中に手が2シャンテン以上なら現物を切る", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 4p 5p 6p 2s 4s 7s 9s 9p ton nan"),
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("9p") }),
  });

  expect(standardChoice(view)).toBe("discard:9p");
});

test("標準CPUは他家リーチ中でもテンパイなら手を進める牌を切る", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 9p 9p 7s 8s 9s ton"),
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("9p") }),
  });

  expect(standardChoice(view)).toBe("discard:ton");
});
