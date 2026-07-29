import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const CLI_PATH = "src/cli/calc.ts";

const runCli = (input: string): string =>
  execFileSync("node", ["--experimental-strip-types", CLI_PATH], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });

const SPEC_EXAMPLE_INPUT = JSON.stringify({
  hand: [
    "1m",
    "2m",
    "3m",
    "4p",
    "5p",
    "6p",
    "7s",
    "8s",
    "9s",
    "ton",
    "ton",
    "ton",
    "5m",
  ],
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

test("仕様の入力例は東場東家のダブル東として2翻40符で返る", () => {
  expect(JSON.parse(runCli(SPEC_EXAMPLE_INPUT))).toMatchObject({
    valid: true,
    han: 2,
    fu: 40,
  });
});

test("仕様の入力例の点数は親のロン2翻40符で3900点になる", () => {
  expect(JSON.parse(runCli(SPEC_EXAMPLE_INPUT)).score).toMatchObject({
    total: 3900,
    payments: [{ from: "discarder", amount: 3900 }],
  });
});

test("和了牌を含む14枚形の入力も受け付ける", () => {
  const input = JSON.stringify({
    hand: [
      "1m",
      "2m",
      "3m",
      "4p",
      "5p",
      "6p",
      "7s",
      "8s",
      "9s",
      "ton",
      "ton",
      "ton",
      "5m",
      "5m",
    ],
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
  });

  expect(JSON.parse(runCli(input))).toMatchObject({ valid: true, han: 2 });
});

test("CLIは不正な入力に対して invalid_input を返す", () => {
  expect(JSON.parse(runCli("not json"))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("CLIは空入力に対して invalid_input を返す", () => {
  expect(JSON.parse(runCli(""))).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});
