import { fileURLToPath } from "node:url";
import { ScoreCalculation } from "../services/score-calculation/index.ts";
import type { CalcResult } from "../services/score-calculation/index.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

/** stdin の生テキストから結果を計算する(JSONとして不正なら invalid_input) */
export const calculateFromText = (text: string): CalcResult => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "invalid_input" };
  }

  let input: unknown;
  try {
    input = JSON.parse(trimmed);
  } catch {
    return { valid: false, reason: "invalid_input" };
  }

  return ScoreCalculation.calculate(input);
};

const main = async (): Promise<void> => {
  const input = await readStdin();
  console.log(JSON.stringify(calculateFromText(input)));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
