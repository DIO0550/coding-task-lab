import { fileURLToPath } from "node:url";
import { Score, ScoreResult } from "../domains/mahjong";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

export const calculateInput = (input: string): ScoreResult => {
  if (input.trim().length === 0) {
    return { valid: false, reason: "invalid_input" };
  }

  try {
    const parsed = JSON.parse(input);
    return Score.calculate(parsed);
  } catch {
    return { valid: false, reason: "invalid_input" };
  }
};

const main = async (): Promise<void> => {
  const input = await readStdin();
  console.log(JSON.stringify(calculateInput(input)));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
