import { Meld } from "../meld/index.ts";
import { Tile } from "../tile/index.ts";
import {
  createTilePool,
  positionInSuit,
  toCounts,
  YAOCHUU_INDICES,
  type TilePool,
} from "./tile-counts.ts";
import { enumerateStandardPartitions, type BlockSpec } from "./standard-partition.ts";
import type {
  Block,
  ChiitoiDecomposition,
  Decomposition,
  KokushiDecomposition,
  StandardDecomposition,
  WaitKind,
  WinHandInput,
} from "./types.ts";

const classifyShuntsuWait = (start: number, winIndex: number): WaitKind => {
  const rank = positionInSuit(start) + 1;
  const winRank = positionInSuit(winIndex) + 1;

  if (winRank === rank + 1) {
    return "kanchan";
  }
  if (winRank === rank) {
    // 残り形は (rank+1, rank+2)。上端(9)に接していれば片側のみの辺張。
    return rank + 2 === 9 ? "penchan" : "ryanmen";
  }
  // winRank === rank + 2。残り形は (rank, rank+1)。下端(1)に接していれば辺張。
  return rank === 1 ? "penchan" : "ryanmen";
};

const meldToBlock = (meld: Meld): Block => ({
  kind: meld.type === "chi" ? "shuntsu" : meld.type === "pon" ? "koutsu" : "kantsu",
  tiles: meld.tiles,
  open: Meld.isOpen(meld),
  meldType: meld.type,
});

const buildConcealedBlock = (pool: TilePool, spec: BlockSpec, open: boolean): Block => {
  if (spec.kind === "koutsu") {
    return { kind: "koutsu", tiles: pool.take(spec.index, 3), open, meldType: null };
  }
  const tiles = [
    ...pool.take(spec.start, 1),
    ...pool.take(spec.start + 1, 1),
    ...pool.take(spec.start + 2, 1),
  ];
  return { kind: "shuntsu", tiles, open: false, meldType: null };
};

const toBlockTuple = (blocks: readonly Block[]): readonly [Block, Block, Block, Block] => {
  if (blocks.length !== 4) {
    throw new Error(`ブロック数が4つではない: ${blocks.length}`);
  }
  return blocks as unknown as readonly [Block, Block, Block, Block];
};

const buildPair = (pool: TilePool, pairIndex: number): readonly [Tile, Tile] => {
  const tiles = pool.take(pairIndex, 2);
  const first = tiles[0];
  const second = tiles[1];
  if (first === undefined || second === undefined) {
    throw new Error("雀頭の牌が2枚そろっていない");
  }
  return [first, second];
};

const buildStandardDecompositions = (input: WinHandInput): readonly StandardDecomposition[] => {
  const blocksNeeded = 4 - input.melds.length;
  const counts = toCounts(input.concealed);
  const partitions = enumerateStandardPartitions(counts, blocksNeeded);
  const winIndex = Tile.toIndex34(input.winTile);
  const meldBlocks = input.melds.map(meldToBlock);

  const decompositions: StandardDecomposition[] = [];

  for (const partition of partitions) {
    if (partition.pairIndex === winIndex) {
      const pool = createTilePool(input.concealed);
      const pair = buildPair(pool, partition.pairIndex);
      const concealedBlocks = partition.blocks.map((spec) =>
        buildConcealedBlock(pool, spec, false),
      );
      const blocks = toBlockTuple([...meldBlocks, ...concealedBlocks]);
      decompositions.push({ kind: "standard", pair, blocks, wait: "tanki", winBlockIndex: null });
    }

    for (let i = 0; i < partition.blocks.length; i += 1) {
      const spec = partition.blocks[i];
      if (spec === undefined) {
        continue;
      }

      if (spec.kind === "koutsu" && spec.index === winIndex) {
        const isRonShanpon = input.winType === "ron";
        const pool = createTilePool(input.concealed);
        const pair = buildPair(pool, partition.pairIndex);
        const concealedBlocks = partition.blocks.map((s, idx) =>
          buildConcealedBlock(pool, s, idx === i && isRonShanpon),
        );
        const blocks = toBlockTuple([...meldBlocks, ...concealedBlocks]);
        decompositions.push({
          kind: "standard",
          pair,
          blocks,
          wait: "shanpon",
          winBlockIndex: input.melds.length + i,
        });
      }

      if (spec.kind === "shuntsu" && winIndex >= spec.start && winIndex <= spec.start + 2) {
        const pool = createTilePool(input.concealed);
        const pair = buildPair(pool, partition.pairIndex);
        const concealedBlocks = partition.blocks.map((s) => buildConcealedBlock(pool, s, false));
        const blocks = toBlockTuple([...meldBlocks, ...concealedBlocks]);
        decompositions.push({
          kind: "standard",
          pair,
          blocks,
          wait: classifyShuntsuWait(spec.start, winIndex),
          winBlockIndex: input.melds.length + i,
        });
      }
    }
  }

  return decompositions;
};

const buildChiitoiDecomposition = (input: WinHandInput): ChiitoiDecomposition | null => {
  if (input.melds.length !== 0 || input.concealed.length !== 14) {
    return null;
  }
  const counts = toCounts(input.concealed);
  const presentIndices: number[] = [];
  for (let index = 0; index < counts.length; index += 1) {
    if ((counts[index] ?? 0) > 0) {
      presentIndices.push(index);
    }
  }
  if (presentIndices.length !== 7) {
    return null;
  }
  if (!presentIndices.every((index) => counts[index] === 2)) {
    return null;
  }

  const pool = createTilePool(input.concealed);
  const pairs = presentIndices.map((index) => buildPair(pool, index));
  return { kind: "chiitoitsu", pairs };
};

const buildKokushiDecomposition = (input: WinHandInput): KokushiDecomposition | null => {
  if (input.melds.length !== 0 || input.concealed.length !== 14) {
    return null;
  }
  const counts = toCounts(input.concealed);
  const totalYaochuu = YAOCHUU_INDICES.reduce((sum, index) => sum + (counts[index] ?? 0), 0);
  const totalAll = counts.reduce((sum, c) => sum + c, 0);
  if (totalYaochuu !== totalAll) {
    return null; // 么九牌以外の牌が混ざっている
  }
  if (!YAOCHUU_INDICES.every((index) => (counts[index] ?? 0) >= 1)) {
    return null;
  }
  if (YAOCHUU_INDICES.some((index) => (counts[index] ?? 0) > 2)) {
    return null;
  }
  const pairIndices = YAOCHUU_INDICES.filter((index) => counts[index] === 2);
  if (pairIndices.length !== 1) {
    return null;
  }

  const winIndex = Tile.toIndex34(input.winTile);
  const thirteenWait = pairIndices[0] === winIndex;
  return { kind: "kokushi", thirteenWait };
};

export const decompose = (input: WinHandInput): readonly Decomposition[] => {
  if (!input.melds.every((meld) => Meld.isValid(meld))) {
    return [];
  }
  const totalTiles = input.concealed.length + input.melds.length * 3;
  if (totalTiles !== 14) {
    return [];
  }
  if (!input.concealed.some((tile) => Tile.equals(tile, input.winTile))) {
    return [];
  }

  const standard = buildStandardDecompositions(input);
  const chiitoi = buildChiitoiDecomposition(input);
  const kokushi = buildKokushiDecomposition(input);

  return [...standard, ...(chiitoi ? [chiitoi] : []), ...(kokushi ? [kokushi] : [])];
};
