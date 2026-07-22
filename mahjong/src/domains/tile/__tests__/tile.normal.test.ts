import { expect, test } from "vitest";
import { Tile } from "../index";

test("牌文字列のパースと文字列化が正しく動作する", () => {
  const t1 = Tile.parse("1m");
  expect(t1).toEqual({ suit: "m", value: 1, isRed: false });
  expect(Tile.toString(t1)).toBe("1m");

  const red = Tile.parse("0p");
  expect(red).toEqual({ suit: "p", value: 5, isRed: true });
  expect(Tile.toString(red)).toBe("0p");

  const chun = Tile.parse("chun");
  expect(chun).toEqual({ suit: "z", value: 7, isRed: false });
  expect(Tile.toString(chun)).toBe("chun");
});

test("赤ドラは同一牌種として比較される", () => {
  const normal5s = Tile.parse("5s");
  const red5s = Tile.parse("0s");

  expect(Tile.equals(normal5s, red5s)).toBe(true);
  expect(Tile.exactEquals(normal5s, red5s)).toBe(false);
});

test("字牌・老頭牌・中張牌・緑一色牌の判定が正しい", () => {
  expect(Tile.isHonor(Tile.parse("ton"))).toBe(true);
  expect(Tile.isTerminal(Tile.parse("1m"))).toBe(true);
  expect(Tile.isTerminal(Tile.parse("9s"))).toBe(true);
  expect(Tile.isSimple(Tile.parse("5p"))).toBe(true);
  expect(Tile.isSimple(Tile.parse("0p"))).toBe(true);
  expect(Tile.isGreen(Tile.parse("2s"))).toBe(true);
  expect(Tile.isGreen(Tile.parse("hatsu"))).toBe(true);
  expect(Tile.isGreen(Tile.parse("1s"))).toBe(false);
});
