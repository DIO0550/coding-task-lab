import { expect, test } from "vitest";
import { Meld } from "../index.ts";

const meld = (type: string, tiles: readonly string[]) => {
  const parsed = Meld.parse({ type, tiles });
  if (parsed === null) {
    throw new Error(`不正な面子: ${type} ${tiles.join(",")}`);
  }
  return parsed;
};

test("暗槓のみが面前扱いの副露と判定される", () => {
  expect(Meld.isConcealed(meld("ankan", ["1m", "1m", "1m", "1m"]))).toBe(true);
  expect(Meld.isConcealed(meld("kan", ["1m", "1m", "1m", "1m"]))).toBe(false);
  expect(Meld.isConcealed(meld("pon", ["1m", "1m", "1m"]))).toBe(false);
  expect(Meld.isConcealed(meld("chi", ["1m", "2m", "3m"]))).toBe(false);
});

test("明カンと暗槓がカンと判定される", () => {
  expect(Meld.isKan(meld("kan", ["2p", "2p", "2p", "2p"]))).toBe(true);
  expect(Meld.isKan(meld("ankan", ["2p", "2p", "2p", "2p"]))).toBe(true);
  expect(Meld.isKan(meld("pon", ["2p", "2p", "2p"]))).toBe(false);
});

test("ポン・カン・暗槓が刻子系と判定される", () => {
  expect(Meld.isTriplet(meld("pon", ["3s", "3s", "3s"]))).toBe(true);
  expect(Meld.isTriplet(meld("kan", ["3s", "3s", "3s", "3s"]))).toBe(true);
  expect(Meld.isTriplet(meld("ankan", ["3s", "3s", "3s", "3s"]))).toBe(true);
  expect(Meld.isTriplet(meld("chi", ["1s", "2s", "3s"]))).toBe(false);
});

test("チーのみが順子と判定される", () => {
  expect(Meld.isSequence(meld("chi", ["7p", "8p", "9p"]))).toBe(true);
  expect(Meld.isSequence(meld("pon", ["7p", "7p", "7p"]))).toBe(false);
});

test("順子の代表牌は最小の牌になる", () => {
  const representative = Meld.representative(meld("chi", ["9m", "7m", "8m"]));
  expect(representative).toStrictEqual({ suit: "m", rank: 7, red: false });
});

test("刻子の代表牌はその牌になる", () => {
  const representative = Meld.representative(meld("pon", ["ton", "ton", "ton"]));
  expect(representative).toStrictEqual({ suit: "z", rank: 1, red: false });
});
