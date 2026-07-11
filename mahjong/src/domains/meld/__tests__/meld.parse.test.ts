import { expect, test } from "vitest";
import { Meld } from "../index.ts";

test("チーは連続する数牌3枚で成立し牌は昇順に正規化される", () => {
  const meld = Meld.parse({ type: "chi", tiles: ["3p", "1p", "2p"] });
  expect(meld).not.toBeNull();
  expect(meld!.type).toBe("chi");
  expect(meld!.tiles.map((t) => `${t.rank}${t.suit}`)).toStrictEqual([
    "1p",
    "2p",
    "3p",
  ]);
});

test("赤5を含むチーも連続していれば成立する", () => {
  const meld = Meld.parse({ type: "chi", tiles: ["0s", "6s", "7s"] });
  expect(meld).not.toBeNull();
  expect(meld!.tiles[0]).toStrictEqual({ suit: "s", rank: 5, red: true });
});

test("ポンは同一牌3枚で成立する", () => {
  const meld = Meld.parse({ type: "pon", tiles: ["ton", "ton", "ton"] });
  expect(meld).not.toBeNull();
  expect(meld!.type).toBe("pon");
  expect(meld!.tiles).toHaveLength(3);
});

test("赤5と通常の5が混在してもポンは成立する", () => {
  const meld = Meld.parse({ type: "pon", tiles: ["0m", "5m", "5m"] });
  expect(meld).not.toBeNull();
  expect(meld!.tiles.filter((t) => t.red)).toHaveLength(1);
});

test("明カンは同一牌4枚で成立する", () => {
  const meld = Meld.parse({ type: "kan", tiles: ["9s", "9s", "9s", "9s"] });
  expect(meld).not.toBeNull();
  expect(meld!.type).toBe("kan");
  expect(meld!.tiles).toHaveLength(4);
});

test("暗槓は同一牌4枚で成立する", () => {
  const meld = Meld.parse({
    type: "ankan",
    tiles: ["haku", "haku", "haku", "haku"],
  });
  expect(meld).not.toBeNull();
  expect(meld!.type).toBe("ankan");
});

test("連続しない3枚のチーは不成立になる", () => {
  expect(Meld.parse({ type: "chi", tiles: ["1m", "2m", "4m"] })).toBeNull();
});

test("スートが混在するチーは不成立になる", () => {
  expect(Meld.parse({ type: "chi", tiles: ["1m", "2m", "3p"] })).toBeNull();
});

test("字牌のチーは不成立になる", () => {
  expect(Meld.parse({ type: "chi", tiles: ["ton", "nan", "sha"] })).toBeNull();
});

test("枚数が合わない面子は不成立になる", () => {
  expect(Meld.parse({ type: "chi", tiles: ["1m", "2m"] })).toBeNull();
  expect(Meld.parse({ type: "pon", tiles: ["1m", "1m", "1m", "1m"] })).toBeNull();
  expect(Meld.parse({ type: "kan", tiles: ["1m", "1m", "1m"] })).toBeNull();
});

test("同一牌でないポンやカンは不成立になる", () => {
  expect(Meld.parse({ type: "pon", tiles: ["1m", "1m", "2m"] })).toBeNull();
  expect(Meld.parse({ type: "kan", tiles: ["1m", "1m", "1m", "1p"] })).toBeNull();
});

test("形式が不正な入力は不成立になる", () => {
  expect(Meld.parse(null)).toBeNull();
  expect(Meld.parse("chi")).toBeNull();
  expect(Meld.parse({ type: "pon" })).toBeNull();
  expect(Meld.parse({ type: "chii", tiles: ["1m", "2m", "3m"] })).toBeNull();
  expect(Meld.parse({ type: "pon", tiles: ["xx", "xx", "xx"] })).toBeNull();
  expect(Meld.parse({ type: "pon", tiles: [1, 1, 1] })).toBeNull();
});
