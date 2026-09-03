import { test, expect } from "vitest";

import { Tile } from "..";

test("牌の種類は34種で萬子・筒子・索子・字牌の順に並ぶ", () => {
  const kinds = Tile.kinds();
  expect(kinds).toHaveLength(34);
  expect(kinds[0]).toBe("1m");
  expect(kinds[9]).toBe("1p");
  expect(kinds[18]).toBe("1s");
  expect(kinds[27]).toBe("ton");
  expect(kinds[33]).toBe("chun");
});

test("牌は全部で136枚あり、赤ドラありなら各色の5が1枚ずつ赤5になる", () => {
  const withAka = Tile.fullSet(true);
  expect(withAka).toHaveLength(136);
  expect(withAka.filter((tile) => Tile.isRed(tile))).toStrictEqual(["0m", "0p", "0s"]);
  expect(Tile.countOf(withAka, "5m")).toBe(4);
  expect(Tile.fullSet(false).filter((tile) => Tile.isRed(tile))).toHaveLength(0);
});

test.each([
  ["1m", true],
  ["0p", true],
  ["9s", true],
  ["chun", true],
  ["10m", false],
  ["1z", false],
  ["east", false],
  ["", false],
])("%s は牌として %s と解釈される", (value, expected) => {
  expect(Tile.isTile(value)).toBe(expected);
});

test("赤5は通常の5と同種として扱われる", () => {
  expect(Tile.normalize("0m")).toBe("5m");
  expect(Tile.equals("0p", "5p")).toBe(true);
  expect(Tile.toIndex("0s")).toBe(Tile.toIndex("5s"));
  expect(Tile.rank("0m")).toBe(5);
});

test.each([
  ["1m", true],
  ["9p", true],
  ["5s", false],
  ["ton", false],
])("%s の老頭牌判定は %s", (tile, expected) => {
  expect(Tile.isTerminal(tile as never)).toBe(expected);
});

test("么九牌は一九牌と字牌、中張牌はそれ以外である", () => {
  expect(Tile.isYaochu("1m")).toBe(true);
  expect(Tile.isYaochu("haku")).toBe(true);
  expect(Tile.isYaochu("2m")).toBe(false);
  expect(Tile.isSimple("8s")).toBe(true);
  expect(Tile.isSimple("nan")).toBe(false);
});

test.each([
  ["1m", "2m"],
  ["9m", "1m"],
  ["0p", "6p"],
  ["pei", "ton"],
  ["sha", "pei"],
  ["chun", "haku"],
  ["haku", "hatsu"],
])("ドラ表示牌 %s のドラは %s", (indicator, dora) => {
  expect(Tile.next(indicator as never)).toBe(dora);
});

test("緑一色の構成牌は索子の2・3・4・6・8と發である", () => {
  expect(["2s", "3s", "4s", "6s", "8s", "hatsu"].every((t) => Tile.isGreen(t as never))).toBe(true);
  expect(Tile.isGreen("5s")).toBe(false);
  expect(Tile.isGreen("1s")).toBe(false);
});

test("牌は種類順に整列され、同種なら赤5が先に来る", () => {
  expect(Tile.sort(["chun", "5m", "1p", "0m", "1m"])).toStrictEqual(["1m", "0m", "5m", "1p", "chun"]);
});

test("枚数配列は34種分あり、赤5は5として数えられる", () => {
  const counts = Tile.counts(["1m", "1m", "0m", "5m", "chun"]);
  expect(counts).toHaveLength(34);
  expect(counts[0]).toBe(2);
  expect(counts[4]).toBe(2);
  expect(counts[33]).toBe(1);
  expect(Tile.fromCounts(counts)).toStrictEqual(["1m", "1m", "5m", "5m", "chun"]);
});

test("1枚取り除くとき同じ表記を優先し、無ければ赤5と通常5を同一視する", () => {
  expect(Tile.removeOne(["0m", "5m", "1p"], "5m")).toStrictEqual(["0m", "1p"]);
  expect(Tile.removeOne(["0m", "1p"], "5m")).toStrictEqual(["1p"]);
  expect(Tile.removeOne(["1p"], "5m")).toStrictEqual(["1p"]);
});

test("風牌は風へ、風は牌へ相互変換できる", () => {
  expect(Tile.ofWind("nan")).toBe("nan");
  expect(Tile.toWind("sha")).toBe("sha");
  expect(Tile.toWind("haku")).toBeUndefined();
  expect(Tile.toWind("1m")).toBeUndefined();
});
