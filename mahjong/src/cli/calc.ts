import { fileURLToPath } from "node:url";

import { Scoring } from "../domains/scoring/index.ts";
import type { WinResult } from "../domains/scoring/index.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

/** 生の JSON 文字列を点数計算結果に変換する。空文字・不正JSONは invalid_input */
export const calculateInput = (input: string): WinResult =>
  Scoring.evaluateJson(input);

const main = async (): Promise<void> => {
  const input = await readStdin();
  console.log(JSON.stringify(calculateInput(input)));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
