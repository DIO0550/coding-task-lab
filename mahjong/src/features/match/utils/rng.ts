import { prngStep } from "@/src/utils/prng";

/**
 * 決定的PRNG状態を使って処理を実行し、結果と消費後の次状態を返す。
 * reducer 内でも純粋(同じ入力 → 同じ出力)にゲーム進行へ乱数を供給するための仕組み。
 */
export const runWithRng = <T>(
  rngState: number,
  run: (rng: () => number) => T,
): readonly [T, number] => {
  const box = { state: rngState };
  const rng = (): number => {
    const [value, next] = prngStep(box.state);
    box.state = next;
    return value;
  };
  const result = run(rng);
  return [result, box.state] as const;
};
