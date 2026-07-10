import { fileURLToPath } from "node:url";

import { ScoreCalculator } from "../services/score-calculator/index.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

const main = async (): Promise<void> => {
  const input = await readStdin();
  const result = ScoreCalculator.calculateFromJson(input);
  console.log(JSON.stringify(result));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
