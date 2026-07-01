import { fileURLToPath } from "node:url";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

type InvalidResult = {
  readonly valid: false;
  readonly reason: "invalid_input";
};

export const invalidInput = (): InvalidResult => ({
  valid: false,
  reason: "invalid_input",
});

export const calculateInput = (input: string): InvalidResult => {
  if (input.trim().length === 0) {
    return invalidInput();
  }

  try {
    JSON.parse(input);
    return invalidInput();
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
