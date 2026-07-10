export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

export const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

export const isFiniteNonNegativeInteger = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

export const isOneOf = <T extends string>(values: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (values as readonly string[]).includes(v);
