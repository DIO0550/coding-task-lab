import { fileURLToPath } from "node:url";

import { ScoreIo } from "../services/score-io/index.ts";

/**
 * 点数計算エンジンのCLIエントリポイント。
 * 標準入力から入力JSONを受け取り、標準出力へ出力JSONを1行で書き出す。
 * 契約は rules/cli-contract.md を参照。
 */
const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

const main = async (): Promise<void> => {
  const input = await readStdin();
  process.stdout.write(`${ScoreIo.evaluateToJson(input)}\n`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
