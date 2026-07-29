import { expect, test } from "vitest";

import { Meld } from "../../../../../domains/meld/index.ts";
import {
  handOf,
  tilesOf,
  viewOf,
} from "../../__tests__/player-view-fixture.ts";
import { TableInfo } from "../../table/index.ts";
import { HandValue } from "../index.ts";

const infoWithDora = (codes: string): TableInfo =>
  TableInfo.create(viewOf({ doraIndicators: tilesOf(codes) }));

test("ドラが多い手ほど打点の見込みが高くなる", () => {
  const info = infoWithDora("1p");
  const withDora = handOf("2m 3m 4m 2p 2p 2p 7s 8s 9s ton ton nan sha");
  const withoutDora = handOf("2m 3m 4m 5p 5p 5p 7s 8s 9s ton ton nan sha");

  expect(HandValue.estimate(withDora, info)).toBeGreaterThan(
    HandValue.estimate(withoutDora, info),
  );
});

test("役牌の刻子がある手は鳴いても役が見込める", () => {
  const hand = handOf("2m 3m 4m 5p 6p 7p 1s 9s 1m 9m", [
    Meld.pon(tilesOf("haku haku haku"), 1),
  ]);

  expect(HandValue.hasYakuProspect(hand, infoWithDora("1p"))).toBe(true);
});

test("すべて中張牌の手は鳴いてもタンヤオが見込める", () => {
  const hand = handOf("2m 3m 4m 5p 6p 7p 3s 4s 5s 6s", [
    Meld.chi(tilesOf("2s 3s 4s"), 3),
  ]);

  expect(HandValue.hasYakuProspect(hand, infoWithDora("1p"))).toBe(true);
});

test("一色に染まった手は鳴いても混一色が見込める", () => {
  const hand = handOf("1m 1m 2m 3m 4m 9m 9m ton ton chun", [
    Meld.pon(tilesOf("5m 5m 5m"), 1),
  ]);

  expect(HandValue.hasYakuProspect(hand, infoWithDora("1p"))).toBe(true);
});

test("役の当てが無い手は鳴いても役が見込めない", () => {
  const hand = handOf("1m 2m 3m 5p 6p 7p 9s 9s ton nan", [
    Meld.chi(tilesOf("2s 3s 4s"), 3),
  ]);

  expect(HandValue.hasYakuProspect(hand, infoWithDora("1p"))).toBe(false);
});
