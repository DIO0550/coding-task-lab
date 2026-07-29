import { expect, test } from "vitest";

import type { PlayerView } from "../../../view/index.ts";
import {
  riichiOf,
  riverOf,
  riversOf,
  tileOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { Safety } from "../index.ts";

const dangerOf = (view: PlayerView, code: string): number =>
  Safety.danger(view, TableInfo.create(view), tileOf(code));

test("リーチしている他家の河にある牌は危険度0になる", () => {
  const view = viewOf({
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("5m") }),
  });

  expect(dangerOf(view, "5m")).toBe(0);
});

test("リーチしている他家がいなければどの牌も危険度0になる", () => {
  const view = viewOf({ rivers: riversOf({ 1: riverOf("5m") }) });

  expect(dangerOf(view, "3p")).toBe(0);
});

test("リーチしていない他家の河にある牌は現物として扱わない", () => {
  const view = viewOf({
    riichi: riichiOf([1]),
    rivers: riversOf({ 2: riverOf("5m") }),
  });

  expect(dangerOf(view, "5m")).toBeGreaterThan(0);
});

test("筋の牌は無筋の牌より危険度が低くなる", () => {
  const view = viewOf({
    riichi: riichiOf([1]),
    rivers: riversOf({ 1: riverOf("2m") }),
  });

  expect(dangerOf(view, "5m")).toBeLessThan(dangerOf(view, "4m"));
});

test("見えている枚数が多い字牌ほど危険度が低くなる", () => {
  const view = viewOf({
    riichi: riichiOf([1]),
    rivers: riversOf({ 0: riverOf("nan nan"), 2: riverOf("nan") }),
  });

  expect(dangerOf(view, "nan")).toBeLessThan(dangerOf(view, "sha"));
});

test("字牌は無筋の中張牌より危険度が低くなる", () => {
  const view = viewOf({ riichi: riichiOf([1]) });

  expect(dangerOf(view, "sha")).toBeLessThan(dangerOf(view, "5p"));
});

test("老頭牌は無筋の中張牌より危険度が低くなる", () => {
  const view = viewOf({ riichi: riichiOf([1]) });

  expect(dangerOf(view, "1p")).toBeLessThan(dangerOf(view, "5p"));
});
