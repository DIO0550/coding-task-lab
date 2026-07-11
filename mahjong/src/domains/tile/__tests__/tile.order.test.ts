import { expect, test } from "vitest";
import { Tile } from "../index.ts";

const tile = (notation: string) => {
  const parsed = Tile.parse(notation);
  if (parsed === null) {
    throw new Error(`不正な牌表記: ${notation}`);
  }
  return parsed;
};

test("並べ替え順は萬子→筒子→索子→字牌の順になる", () => {
  expect(Tile.compare(tile("9m"), tile("1p"))).toBeLessThan(0);
  expect(Tile.compare(tile("9p"), tile("1s"))).toBeLessThan(0);
  expect(Tile.compare(tile("9s"), tile("ton"))).toBeLessThan(0);
});

test("同じスートの牌はランク昇順に並ぶ", () => {
  expect(Tile.compare(tile("1m"), tile("2m"))).toBeLessThan(0);
  expect(Tile.compare(tile("chun"), tile("ton"))).toBeGreaterThan(0);
});

test("赤5は通常の5と同じ並び順として扱われる", () => {
  expect(Tile.compare(tile("0m"), tile("5m"))).toBe(0);
  expect(Tile.compare(tile("0s"), tile("4s"))).toBeGreaterThan(0);
  expect(Tile.compare(tile("0s"), tile("6s"))).toBeLessThan(0);
});

test("全牌一覧は34種を赤なしの正準順で返す", () => {
  const all = Tile.all();
  expect(all).toHaveLength(34);
  expect(all[0]).toStrictEqual({ suit: "m", rank: 1, red: false });
  expect(all[33]).toStrictEqual({ suit: "z", rank: 7, red: false });
  expect(all.every((t) => !t.red)).toBe(true);
  const keys = new Set(all.map(Tile.key));
  expect(keys.size).toBe(34);
  const sorted = all.toSorted(Tile.compare);
  expect(sorted).toStrictEqual([...all]);
});

test("数牌の次の牌はランク+1で9の次は1に戻る", () => {
  expect(Tile.next(tile("1m"))).toStrictEqual(tile("2m"));
  expect(Tile.next(tile("9m"))).toStrictEqual(tile("1m"));
  expect(Tile.next(tile("9s"))).toStrictEqual(tile("1s"));
});

test("風牌の次の牌は東→南→西→北→東の順に循環する", () => {
  expect(Tile.next(tile("ton"))).toStrictEqual(tile("nan"));
  expect(Tile.next(tile("nan"))).toStrictEqual(tile("sha"));
  expect(Tile.next(tile("sha"))).toStrictEqual(tile("pei"));
  expect(Tile.next(tile("pei"))).toStrictEqual(tile("ton"));
});

test("三元牌の次の牌は白→發→中→白の順に循環する", () => {
  expect(Tile.next(tile("haku"))).toStrictEqual(tile("hatsu"));
  expect(Tile.next(tile("hatsu"))).toStrictEqual(tile("chun"));
  expect(Tile.next(tile("chun"))).toStrictEqual(tile("haku"));
});

test("ドラ表示牌9mのドラは1mになる", () => {
  expect(Tile.doraFromIndicator(tile("9m"))).toStrictEqual(tile("1m"));
});

test("ドラ表示牌北のドラは東になる", () => {
  expect(Tile.doraFromIndicator(tile("pei"))).toStrictEqual(tile("ton"));
});

test("ドラ表示牌中のドラは白になる", () => {
  expect(Tile.doraFromIndicator(tile("chun"))).toStrictEqual(tile("haku"));
});

test("赤5がドラ表示牌のときドラは赤でない6になる", () => {
  expect(Tile.doraFromIndicator(tile("0p"))).toStrictEqual(tile("6p"));
});
