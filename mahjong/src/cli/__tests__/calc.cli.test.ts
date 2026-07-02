import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { calculateFromText } from "../calc.ts";

// vitest はプロジェクトルートで実行される
const CLI_PATH = resolve(process.cwd(), "src/cli/calc.ts");

const runCli = (input: string): unknown => {
  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", CLI_PATH],
    { input, encoding: "utf8" },
  );
  return JSON.parse(stdout);
};

test("空入力は invalid_input を返す", () => {
  expect(calculateFromText("")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("JSONとして不正な入力は invalid_input を返す", () => {
  expect(calculateFromText("{not json")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});

test("CLIプロセスは仕様の入力例に対して和了結果のJSONを標準出力に返す", () => {
  const input = JSON.stringify({
    hand: [
      "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
      "ton", "ton", "ton", "5m",
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
  expect(runCli(input)).toStrictEqual({
    valid: true,
    yaku: [
      { name: "seat_wind", han: 1 },
      { name: "round_wind", han: 1 },
    ],
    han: 2,
    fu: 40,
    score: {
      total: 3900,
      payments: [{ from: "discarder", amount: 3900 }],
    },
  });
});

test("CLIプロセスは不正なJSONに対して invalid_input を返す", () => {
  expect(runCli("oops")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});
