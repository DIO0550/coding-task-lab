import { Scoring } from "../../domains/scoring/index.ts";
import type { ScoreResult } from "../../domains/scoring/index.ts";
import { parseScoreInput } from "./parse-input.ts";

const calculateFromJson = (jsonText: string): ScoreResult => {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { valid: false, reason: "invalid_input" };
  }

  const input = parseScoreInput(raw);
  if (input === null) {
    return { valid: false, reason: "invalid_input" };
  }

  return Scoring.calculate(input);
};

export const ScoreCalculator = { calculateFromJson } as const;
