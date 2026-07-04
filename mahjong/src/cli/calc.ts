import { fileURLToPath } from "node:url";

import { parseScoreInput, ScoreCalculator, type ScoreResult } from "../services/score/index.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

export const invalidInput = (): ScoreResult => ({
  valid: false,
  reason: "invalid_input",
});

export const calculateInput = (input: string): ScoreResult => {
  if (input.trim().length === 0) {
    return invalidInput();
  }

  try {
    const parsed: unknown = JSON.parse(input);
    const scoreInput = parseScoreInput(parsed);
    return scoreInput === undefined ? invalidInput() : ScoreCalculator.calculate(scoreInput);
  } catch {
    return invalidInput();
  }
};

const main = async (): Promise<void> => {
  const input = await readStdin();
  console.log(JSON.stringify(calculateInput(input)));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
