import { fileURLToPath } from "node:url";
import { ScoreCalculator } from "../services/score-calculator/index.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

/** 標準入力のJSON文字列から結果JSON文字列を作る */
export const runCalc = (input: string): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return JSON.stringify({ valid: false, reason: "invalid_input" });
  }
  return JSON.stringify(ScoreCalculator.calculate(parsed));
};

const main = async (): Promise<void> => {
  console.log(runCalc(await readStdin()));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
