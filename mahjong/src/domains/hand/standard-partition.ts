import { isNumberIndex, positionInSuit, withDelta } from "./tile-counts.ts";

export type BlockSpec =
  | Readonly<{ kind: "shuntsu"; start: number }>
  | Readonly<{ kind: "koutsu"; index: number }>;

export type PartitionResult = Readonly<{
  pairIndex: number;
  blocks: readonly BlockSpec[];
}>;

/**
 * 34種カウント配列を「雀頭1つ + blocksNeeded個の面子(順子・刻子)」に過不足なく
 * 分解できる全パターンを列挙する。常に残り牌のうち最小の index から処理するため、
 * 生成される blocks は index 昇順の正準順序になり重複は生じない。
 */
export const enumerateStandardPartitions = (
  counts: readonly number[],
  blocksNeeded: number,
): readonly PartitionResult[] => {
  const results: PartitionResult[] = [];

  const recurse = (
    current: readonly number[],
    pairIndex: number | null,
    blocks: readonly BlockSpec[],
  ): void => {
    const firstIndex = current.findIndex((c) => c > 0);

    if (firstIndex === -1) {
      if (pairIndex !== null && blocks.length === blocksNeeded) {
        results.push({ pairIndex, blocks });
      }
      return;
    }

    const count = current[firstIndex] ?? 0;

    if (pairIndex === null && count >= 2) {
      recurse(withDelta(current, [[firstIndex, -2]]), firstIndex, blocks);
    }

    if (blocks.length < blocksNeeded && count >= 3) {
      recurse(withDelta(current, [[firstIndex, -3]]), pairIndex, [
        ...blocks,
        { kind: "koutsu", index: firstIndex },
      ]);
    }

    if (
      blocks.length < blocksNeeded &&
      isNumberIndex(firstIndex) &&
      positionInSuit(firstIndex) <= 6 &&
      count >= 1 &&
      (current[firstIndex + 1] ?? 0) >= 1 &&
      (current[firstIndex + 2] ?? 0) >= 1
    ) {
      recurse(
        withDelta(current, [
          [firstIndex, -1],
          [firstIndex + 1, -1],
          [firstIndex + 2, -1],
        ]),
        pairIndex,
        [...blocks, { kind: "shuntsu", start: firstIndex }],
      );
    }
  };

  recurse(counts, null, []);
  return results;
};
