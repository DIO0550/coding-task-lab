import { expect, test } from "vitest";

import type { CpuLevel } from "../../../../../domains/participant/index.ts";
import type { PlayerView } from "../../../view/index.ts";
import {
  choiceOf,
  discardActions,
  handOf,
  riichiActionsOf,
  tilesOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { RiichiChoice } from "../index.ts";

/** 待ちが広いテンパイ(nan を切ると 4m/7m の両面待ち)。 */
const GOOD_WAIT_HAND = "1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan";

/** 待ちが狭いテンパイ(nan を切ると 3m の嵌張待ち)。 */
const BAD_WAIT_HAND = "1m 2m 2m 3m 4m 4p 5p 6p 7s 8s 9s ton ton nan";

const riichiChoice = (view: PlayerView, level: CpuLevel): string =>
  choiceOf(view, RiichiChoice.choose(view, level, TableInfo.create(view)));

const tenpaiView = (codes: string, doraIndicators: readonly string[] = []) => {
  const hand = handOf(codes);
  return viewOf({
    hand,
    doraIndicators: doraIndicators.flatMap((code) => tilesOf(code)),
    actions: [...discardActions(hand), ...riichiActionsOf(hand, "nan")],
  });
};

test("入門CPUはテンパイしたら待ちが狭くてもリーチを宣言する", () => {
  expect(riichiChoice(tenpaiView(BAD_WAIT_HAND), "beginner")).toBe(
    "riichi:nan",
  );
});

test("標準CPUは待ちが広ければリーチを宣言する", () => {
  expect(riichiChoice(tenpaiView(GOOD_WAIT_HAND), "standard")).toBe(
    "riichi:nan",
  );
});

test("標準CPUは待ちが狭く打点も無ければダマにする", () => {
  expect(riichiChoice(tenpaiView(BAD_WAIT_HAND), "standard")).toBe("none");
});

test("標準CPUは待ちが狭くてもドラが多ければリーチを宣言する", () => {
  expect(riichiChoice(tenpaiView(BAD_WAIT_HAND, ["pei"]), "standard")).toBe(
    "riichi:nan",
  );
});

test("上級CPUも待ちが狭く打点も無ければダマにする", () => {
  expect(riichiChoice(tenpaiView(BAD_WAIT_HAND), "advanced")).toBe("none");
});

test("テンパイしていなければリーチを宣言しない", () => {
  const hand = handOf("1m 3m 5m 7m 9m 2p 4p 6p 8p 1s 3s 5s ton nan");
  const view = viewOf({ hand, actions: discardActions(hand) });

  expect(riichiChoice(view, "beginner")).toBe("none");
});
