import { test, expect } from "vitest";

import { Meld } from "..";

test("順子のチーは並び順に関係なく成立し、牌は整列される", () => {
  expect(Meld.create("chi", ["3m", "1m", "2m"])).toStrictEqual({ type: "chi", tiles: ["1m", "2m", "3m"] });
});

test("ポンは同じ牌3枚で成立し、赤5を含んでもよい", () => {
  expect(Meld.create("pon", ["5p", "0p", "5p"])?.type).toBe("pon");
});

test("明槓と暗槓は同じ牌4枚で成立する", () => {
  expect(Meld.create("kan", ["ton", "ton", "ton", "ton"])?.type).toBe("kan");
  expect(Meld.create("ankan", ["9s", "9s", "9s", "9s"])?.type).toBe("ankan");
});

test("暗槓は門前を保ち、それ以外の副露は門前を崩す", () => {
  const ankan = Meld.create("ankan", ["1m", "1m", "1m", "1m"]);
  const pon = Meld.create("pon", ["1m", "1m", "1m"]);
  expect(ankan && Meld.isOpen(ankan)).toBe(false);
  expect(pon && Meld.isOpen(pon)).toBe(true);
});

test("JSON 表記の副露を解釈できる", () => {
  expect(Meld.parse({ type: "chi", tiles: ["4s", "5s", "6s"] })).toStrictEqual({
    type: "chi",
    tiles: ["4s", "5s", "6s"],
  });
  expect(Meld.parseAll([{ type: "pon", tiles: ["haku", "haku", "haku"] }])).toHaveLength(1);
});

test("ポンに同じ牌を加えると加槓(明槓)になる", () => {
  const pon = Meld.create("pon", ["chun", "chun", "chun"]);
  expect(pon && Meld.addKan(pon, "chun")).toStrictEqual({
    type: "kan",
    tiles: ["chun", "chun", "chun", "chun"],
  });
});
