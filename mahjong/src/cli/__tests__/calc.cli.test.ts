import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "vitest";

// jsdom テスト環境ではグローバルURLコンストラクタがjsdom側に置き換えられ、
// `new URL(相対パス, import.meta.url)` が file: スキームとして解決されないため、
// import.meta.url を直接 fileURLToPath に渡し、パス結合は node:path で行う。
const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const CLI_PATH = path.join(path.dirname(TEST_FILE_PATH), "..", "calc.ts");

const runCli = (input: string): string =>
  execFileSync("node", ["--experimental-strip-types", CLI_PATH], {
    input,
    encoding: "utf8",
  });

test("空入力はinvalid_inputのJSONのみを標準出力に返す", () => {
  const stdout = runCli("");
  expect(stdout).toBe('{"valid":false,"reason":"invalid_input"}\n');
});

test("handに和了牌が含まれない13枚入力はinvalid_inputだけを返す", () => {
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

  expect(runCli(input)).toBe('{"valid":false,"reason":"invalid_input"}\n');
});

test("handに和了牌を含む14枚入力は結果JSONだけを返す", () => {
  const input = JSON.stringify({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
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

  expect(JSON.parse(runCli(input))).toMatchObject({
    valid: true,
    han: 2,
    fu: 40,
    score: { total: 3900 },
  });
});
