import { expect, test } from "vitest";

import { Tile } from "../../../../../domains/tile/index.ts";
import type { PlayerView } from "../../../view/index.ts";
import {
  handOf,
  riverOf,
  riversOf,
  tilesOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { DiscardCandidate } from "../index.ts";
import type { DiscardRanking } from "../index.ts";

const candidatesOf = (view: PlayerView): readonly DiscardCandidate[] =>
  DiscardCandidate.list(
    view,
    TableInfo.create(view),
    view.hand.concealed.map((_, index) => index),
  );

const pick = (
  candidates: readonly DiscardCandidate[],
  code: string,
): DiscardCandidate | undefined =>
  candidates.find((candidate) => Tile.toCode(candidate.tile) === code);

const byShanten: DiscardRanking = (candidate) => [
  candidate.shanten,
  candidate.index,
];

test("切った後にテンパイする牌のシャンテン数は0になる", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan"),
  });

  expect(pick(candidatesOf(view), "nan")?.shanten).toBe(0);
});

test("切るとテンパイが崩れる牌のシャンテン数は1になる", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan"),
  });

  expect(pick(candidatesOf(view), "5m")?.shanten).toBe(1);
});

test("受け入れ枚数は両面待ちなら8枚になる", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan"),
  });

  expect(pick(candidatesOf(view), "nan")?.acceptance).toBe(8);
});

test("受け入れ枚数は場に見えている牌を除いて数える", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan"),
    rivers: riversOf({ 2: riverOf("4m 4m") }),
  });

  expect(pick(candidatesOf(view), "nan")?.acceptance).toBe(6);
});

test("切った後に手元へ残るドラの枚数を数える", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan"),
    doraIndicators: tilesOf("4p"),
  });

  expect(pick(candidatesOf(view), "5p")?.doraCount).toBe(0);
});

test("比較キーが最も小さい候補が選ばれる", () => {
  const view = viewOf({
    hand: handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan"),
  });
  const best = DiscardCandidate.best(candidatesOf(view), byShanten);

  expect(Tile.toCode(best?.tile ?? tilesOf("1m")[0])).toBe("nan");
});

test("候補が無ければ選ばれる候補も無い", () => {
  const view = viewOf();

  expect(
    DiscardCandidate.best(
      DiscardCandidate.list(view, TableInfo.create(view), []),
      byShanten,
    ),
  ).toBeNull();
});
