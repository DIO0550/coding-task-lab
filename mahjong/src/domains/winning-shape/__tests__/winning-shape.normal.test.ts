import { test, expect } from "vitest";

import { Hand } from "@/src/domains/hand";
import { Meld } from "@/src/domains/meld";
import type { Tile } from "@/src/domains/tile";

import { WinningShape } from "..";

const invalidHand = (): never => {
  throw new Error("invalid hand for test");
};

const hand = (tiles: readonly Tile[], melds: readonly Meld[] = []): Hand => {
  return Hand.create(tiles, melds) ?? invalidHand();
};

test("4面子1雀頭の手は通常形として解釈される", () => {
  const shapes = WinningShape.enumerate(
    hand(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]),
    "5m",
    "ron",
  );
  expect(shapes).toHaveLength(1);
  expect(shapes[0]).toMatchObject({ kind: "standard", pair: "5m", wait: "tanki" });
});

test("両面待ちの和了は ryanmen として解釈される", () => {
  const shapes = WinningShape.enumerate(
    hand(["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]),
    "4m",
    "ron",
  );
  expect(shapes.map((s) => s.kind === "standard" && s.wait)).toStrictEqual(["ryanmen"]);
});

test("嵌張待ちの和了は kanchan として解釈される", () => {
  const shapes = WinningShape.enumerate(
    hand(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]),
    "2m",
    "tsumo",
  );
  expect(shapes.map((s) => s.kind === "standard" && s.wait)).toStrictEqual(["kanchan"]);
});

test("辺張待ち(12待ちの3・89待ちの7)は penchan として解釈される", () => {
  const low = WinningShape.enumerate(
    hand(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]),
    "3m",
    "ron",
  );
  const high = WinningShape.enumerate(
    hand(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"]),
    "7s",
    "ron",
  );
  expect(low.map((s) => s.kind === "standard" && s.wait)).toStrictEqual(["penchan"]);
  expect(high.map((s) => s.kind === "standard" && s.wait)).toStrictEqual(["penchan"]);
});

test("双碰待ちでロンした刻子は明刻扱い、ツモなら暗刻扱いになる", () => {
  const tiles: readonly Tile[] = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"];
  const ron = WinningShape.enumerate(hand(tiles), "ton", "ron");
  const tsumo = WinningShape.enumerate(hand(tiles), "ton", "tsumo");
  const ronKoutsu = ron[0].kind === "standard" ? ron[0].mentsu[ron[0].winMentsuIndex ?? -1] : undefined;
  const tsumoKoutsu = tsumo[0].kind === "standard" ? tsumo[0].mentsu[tsumo[0].winMentsuIndex ?? -1] : undefined;
  expect(ron[0]).toMatchObject({ kind: "standard", wait: "shanpon" });
  expect(ronKoutsu?.open).toBe(true);
  expect(tsumoKoutsu?.open).toBe(false);
});

test("待ちの取り方が複数ある手は解釈が複数列挙される", () => {
  // 45666m で 6m 和了: 456m の両面待ち(雀頭 66m)と 66m の単騎待ちの2通り
  const shapes = WinningShape.enumerate(
    hand(["4m", "5m", "6m", "6m", "6m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton"]),
    "6m",
    "ron",
  );
  const waits = shapes.map((s) => s.kind === "standard" && s.wait).sort();
  expect(waits).toStrictEqual(["ryanmen", "tanki"]);
});

test("面子分解が複数ある手(111222333)は刻子解釈と順子解釈の両方が列挙される", () => {
  const shapes = WinningShape.enumerate(
    hand(["1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m", "7s", "8s", "9s", "ton", "ton"]),
    "ton",
    "tsumo",
  );
  const kinds = shapes.map((s) => (s.kind === "standard" ? s.mentsu.filter((m) => m.type === "koutsu").length : -1));
  expect(kinds.sort()).toStrictEqual([0, 3]);
});

test("副露を含む手は副露を面子として固定した上で解釈される", () => {
  const pon = Meld.create("pon", ["haku", "haku", "haku"])!;
  const chi = Meld.create("chi", ["1p", "2p", "3p"])!;
  const shapes = WinningShape.enumerate(hand(["1m", "2m", "3m", "7s", "8s", "9s", "5m", "5m"], [pon, chi]), "9s", "ron");
  expect(shapes).toHaveLength(1);
  const shape = shapes[0];
  expect(shape.kind).toBe("standard");
  expect(shape.kind === "standard" && shape.mentsu.filter((m) => m.open)).toHaveLength(2);
  expect(shape.kind === "standard" && shape.wait).toBe("ryanmen");
});

test("暗槓は槓子(門前扱い)として解釈される", () => {
  const ankan = Meld.create("ankan", ["9s", "9s", "9s", "9s"])!;
  const shapes = WinningShape.enumerate(hand(["1m", "2m", "3m", "4p", "5p", "6p", "7p", "8p", "9p", "5m", "5m"], [ankan]), "5m", "tsumo");
  const kantsu = shapes[0].kind === "standard" ? shapes[0].mentsu.find((m) => m.type === "kantsu") : undefined;
  expect(kantsu).toStrictEqual({ type: "kantsu", tiles: ["9s", "9s", "9s", "9s"], open: false });
});

test("七対子は7種の対子として解釈される", () => {
  const shapes = WinningShape.enumerate(
    hand(["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "ton", "ton", "chun", "chun"]),
    "chun",
    "ron",
  );
  expect(shapes).toStrictEqual([{ kind: "chiitoi", pairs: ["1m", "3m", "5p", "7p", "9s", "ton", "chun"] }]);
});

test("二盃口形の手は通常形と七対子の両方として解釈される", () => {
  const shapes = WinningShape.enumerate(
    hand(["1m", "1m", "2m", "2m", "3m", "3m", "7p", "7p", "8p", "8p", "9p", "9p", "nan", "nan"]),
    "nan",
    "ron",
  );
  expect(shapes.map((s) => s.kind).sort()).toStrictEqual(["chiitoi", "standard"]);
});

test("国士無双は13種の么九牌+1枚として解釈され、雀頭で和了すれば十三面待ちになる", () => {
  const thirteen = WinningShape.enumerate(
    hand(["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"]),
    "chun",
    "tsumo",
  );
  const single = WinningShape.enumerate(
    hand(["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"]),
    "1m",
    "ron",
  );
  expect(thirteen).toStrictEqual([{ kind: "kokushi", pair: "chun", thirteenWait: true }]);
  expect(single).toStrictEqual([{ kind: "kokushi", pair: "chun", thirteenWait: false }]);
});

test("赤5を含む手も通常の5として面子に分解される", () => {
  const shapes = WinningShape.enumerate(
    hand(["0m", "5m", "5m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "2p", "2p"]),
    "0m",
    "tsumo",
  );
  expect(shapes[0]).toMatchObject({ kind: "standard", wait: "shanpon" });
});

test("13枚の手の待ち牌を列挙できる", () => {
  expect(WinningShape.waits(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"], 0)).toStrictEqual(["5m"]);
  expect(WinningShape.waits(["2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"], 0)).toStrictEqual(["1m", "4m"]);
});

test("副露がある13枚相当の手も待ちを列挙できる", () => {
  expect(WinningShape.waits(["2m", "3m", "4p", "5p", "6p", "5m", "5m"], 2)).toStrictEqual(["1m", "4m"]);
});

test("国士無双の十三面待ちは13種すべてが待ちになる", () => {
  const waits = WinningShape.waits(["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"], 0);
  expect(waits).toHaveLength(13);
});

test("テンパイしていない手には待ちがない", () => {
  expect(WinningShape.isTenpai(["1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "pei"], 0)).toBe(false);
});
