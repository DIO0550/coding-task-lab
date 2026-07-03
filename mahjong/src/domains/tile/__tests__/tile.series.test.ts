import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("nextInSeriesは数牌の9から1へ巡回する", () => {
  expect(Tile.nextInSeries(Tile.parse("9m") as Tile)).toStrictEqual({
    kind: "number",
    suit: "m",
    rank: 1,
    red: false,
  });
});

test("nextInSeriesは数牌の途中では次の数字を返す", () => {
  expect(Tile.nextInSeries(Tile.parse("3p") as Tile)).toStrictEqual({
    kind: "number",
    suit: "p",
    rank: 4,
    red: false,
  });
});

test("nextInSeriesは風牌の北(pei)から東(ton)へ巡回する", () => {
  expect(Tile.nextInSeries(Tile.parse("pei") as Tile)).toStrictEqual({
    kind: "honor",
    honor: "ton",
  });
});

test("nextInSeriesは三元牌の中(chun)から白(haku)へ巡回する", () => {
  expect(Tile.nextInSeries(Tile.parse("chun") as Tile)).toStrictEqual({
    kind: "honor",
    honor: "haku",
  });
});

test("nextInSeriesは三元牌の白から發へ進む", () => {
  expect(Tile.nextInSeries(Tile.parse("haku") as Tile)).toStrictEqual({
    kind: "honor",
    honor: "hatsu",
  });
});

test("toIndex34とfromIndex34は0から33までの往復で一致する", () => {
  for (let i = 0; i < 34; i += 1) {
    expect(Tile.toIndex34(Tile.fromIndex34(i))).toBe(i);
  }
});

test("fromIndex34は赤フラグが常にfalseの代表牌を返す", () => {
  const tile = Tile.fromIndex34(4);
  expect(tile).toStrictEqual({ kind: "number", suit: "m", rank: 5, red: false });
});

test("allKindsは34種類の牌をtoIndex34昇順で返す", () => {
  const kinds = Tile.allKinds();
  expect(kinds).toHaveLength(34);
  const indices = kinds.map(Tile.toIndex34);
  expect(indices).toStrictEqual([...indices].sort((a, b) => a - b));
  expect(new Set(indices).size).toBe(34);
});
