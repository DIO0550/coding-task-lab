import { test, expect } from "vitest";

import { Meld } from "..";

test.each([
  ["chi", ["1m", "2m", "4m"]],
  ["chi", ["8m", "9m", "1m"]],
  ["chi", ["1m", "2m", "3p"]],
  ["chi", ["ton", "nan", "sha"]],
  ["chi", ["1m", "2m"]],
  ["pon", ["1m", "1m", "2m"]],
  ["pon", ["1m", "1m", "1m", "1m"]],
  ["kan", ["1m", "1m", "1m"]],
  ["ankan", ["1m", "1m", "1m", "1p"]],
] as const)("%s %j は副露として成立しない", (type, tiles) => {
  expect(Meld.create(type, [...tiles])).toBeUndefined();
});

test.each([
  null,
  "pon",
  { type: "pon" },
  { type: "kakan", tiles: ["1m", "1m", "1m", "1m"] },
  { type: "pon", tiles: ["1m", "1m", "1z"] },
])("不正な JSON %j は副露として解釈されない", (value) => {
  expect(Meld.parse(value)).toBeUndefined();
});

test("チーに牌を加えても加槓にはならない", () => {
  const chi = Meld.create("chi", ["1m", "2m", "3m"]);
  expect(chi && Meld.addKan(chi, "1m")).toBeUndefined();
});
