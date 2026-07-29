import { expect, test } from "vitest";

import { Meld } from "../../../../../domains/meld/index.ts";
import {
  calledRiverOf,
  handOf,
  meldsOf,
  riichiOf,
  riverOf,
  riversOf,
  tileOf,
  tilesOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../index.ts";

test("自分の手牌と河に見えている分だけ残り枚数が減る", () => {
  const view = viewOf({
    hand: handOf("1m 1m 3m 4p 5p 6p 7s 8s 9s ton ton nan sha"),
    rivers: riversOf({ 2: riverOf("1m") }),
  });

  expect(TableInfo.remaining(TableInfo.create(view), tileOf("1m"))).toBe(1);
});

test("鳴かれた捨て牌は河と副露で二重に数えない", () => {
  const view = viewOf({
    rivers: riversOf({ 1: calledRiverOf("haku") }),
    melds: meldsOf({ 2: [Meld.pon(tilesOf("haku haku haku"), 1)] }),
  });

  expect(TableInfo.remaining(TableInfo.create(view), tileOf("haku"))).toBe(1);
});

test("ドラ表示牌の次の牌がドラになる", () => {
  const info = TableInfo.create(viewOf({ doraIndicators: tilesOf("1p") }));

  expect(TableInfo.isDora(info, tileOf("2p"))).toBe(true);
});

test("赤5はドラ表示牌に関わらずドラとして数える", () => {
  const info = TableInfo.create(viewOf({ doraIndicators: tilesOf("1p") }));

  expect(TableInfo.doraCount(info, tilesOf("0m 2p 3s"))).toBe(2);
});

test("リーチしている他家だけが脅威になる", () => {
  const view = viewOf({ seat: 0, riichi: riichiOf([0, 2]) });

  expect(TableInfo.create(view).threats).toStrictEqual([2]);
});

test("場風・自風・三元牌が役牌になる", () => {
  const info = TableInfo.create(viewOf({ seat: 0, dealer: 0 }));

  expect(
    tilesOf("ton haku hatsu chun").every((tile) =>
      TableInfo.isValueTile(info, tile),
    ),
  ).toBe(true);
});

test("自風でも場風でもない風牌は役牌にならない", () => {
  const info = TableInfo.create(viewOf({ seat: 0, dealer: 0 }));

  expect(TableInfo.isValueTile(info, tileOf("nan"))).toBe(false);
});
