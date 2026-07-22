import { fileURLToPath } from "node:url";
import { ScoreService } from "../services/score-service/index.ts";
import type { OutputJson } from "../types/output.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

export const calculateInput = (raw: string): OutputJson => {
  return ScoreService.calculateFromRawInput(raw);
};

const main = async (): Promise<void> => {
  const input = await readStdin();
  const result = calculateInput(input);
  console.log(JSON.stringify(result));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
