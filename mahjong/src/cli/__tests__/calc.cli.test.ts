import { execFileSync } from "node:child_process";

import { test, expect } from "vitest";

import { runCalc } from "../calc.ts";

const runCli = (input: string): string =>
  execFileSync("node", ["--experimental-strip-types", "src/cli/calc.ts"], {
    input,
    encoding: "utf8",
    cwd: process.cwd(),
  }).trim();

test("CLIは標準入力のJSONから結果JSONを標準出力へ返す", () => {
  const input = JSON.stringify({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
  });
  const output: unknown = JSON.parse(runCli(input));
  expect(output).toMatchObject({
    valid: true,
    han: 2,
    fu: 40,
    score: { total: 3900 },
  });
});

test("JSONとして解釈できない入力は invalid_input を返す", () => {
  expect(JSON.parse(runCalc("not json"))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("空入力は invalid_input を返す", () => {
  expect(JSON.parse(runCalc(""))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("和了できない入力はCLI経由でも not_winning_hand を返す", () => {
  const input = JSON.stringify({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "2s", "haku", "9m", "9m"],
    melds: [],
    winTile: "9m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
  });
  expect(JSON.parse(runCalc(input))).toStrictEqual({
    valid: false,
    reason: "not_winning_hand",
  });
});
