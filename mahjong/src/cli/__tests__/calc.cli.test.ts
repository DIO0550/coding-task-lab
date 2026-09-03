import { execFileSync } from "node:child_process";

import { test, expect } from "vitest";

import { calculateInput } from "../calc";

/** `pnpm run test` は mahjong/ で実行されるため、CLI もそこを基準に起動する */
const projectRoot = process.cwd();

const acceptanceInput =
  '{"hand":["1m","2m","3m","4p","5p","6p","7s","8s","9s","ton","ton","ton","5m"],"melds":[],"winTile":"5m","winType":"ron","seatWind":"ton","roundWind":"ton","dora":[],"uraDora":[],"riichi":"none","ippatsu":false,"situational":[]}';

const runCli = (input: string): string =>
  execFileSync("node", ["--import", "./scripts/register-ts-resolver.mjs", "src/cli/calc.ts"], {
    cwd: projectRoot,
    input,
    encoding: "utf8",
  });

test("空入力は invalid_input を返す", () => {
  expect(calculateInput("")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("JSON として壊れた入力は invalid_input を返す", () => {
  expect(calculateInput("{ hand: ")).toStrictEqual({ valid: false, reason: "invalid_input" });
});

test("和了形の入力 JSON は和了結果を返す", () => {
  expect(calculateInput(acceptanceInput)).toStrictEqual({
    valid: true,
    yaku: [
      { name: "seat_wind", han: 1 },
      { name: "round_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: { total: 3900, payments: [{ from: "discarder", amount: 3900 }] },
  });
});

test("CLI プロセスは標準入力の JSON から結果 JSON を1行で標準出力に返す", () => {
  const output = runCli(acceptanceInput);
  expect(output.endsWith("\n")).toBe(true);
  expect(JSON.parse(output)).toStrictEqual({
    valid: true,
    yaku: [
      { name: "seat_wind", han: 1 },
      { name: "round_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: { total: 3900, payments: [{ from: "discarder", amount: 3900 }] },
  });
});

test("CLI プロセスは不正な入力に対して invalid_input を返す", () => {
  expect(JSON.parse(runCli("not json"))).toStrictEqual({ valid: false, reason: "invalid_input" });
});
