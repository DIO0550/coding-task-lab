import { fileURLToPath } from "node:url";

import { ScoreCalculator } from "@/src/services/score-calculator";
import type { ScoringResult } from "@/src/types/scoring";

/**
 * 点数計算 CLI: `echo '<入力JSON>' | pnpm --silent calc`
 * 標準入力の JSON を点数計算エンジンに渡し、結果 JSON を1行で標準出力へ書き出す。
 */
const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

export const calculateInput = (input: string): ScoringResult => ScoreCalculator.calculateFromJson(input);

const main = async (): Promise<void> => {
  const input = await readStdin();
  process.stdout.write(`${JSON.stringify(calculateInput(input))}\n`);
};

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
