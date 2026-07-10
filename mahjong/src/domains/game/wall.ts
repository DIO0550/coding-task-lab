import type { HonorKind, NumberRank, Suit, Tile } from "../tile/index.ts";
import { Prng } from "./prng.ts";
import type { MatchState, RuleSet } from "./types.ts";

export const HAND_SIZE = 13;
export const LIVE_WALL_SIZE = 70;
export const DEAD_WALL_SIZE = 14;
export const TOTAL_TILES = 136;
export const MAX_KAN_COUNT = 4;

/** 配牌領域: wall[0, 52) を seat0..3 に13枚ずつ割り当てる。 */
const HANDS_SIZE = HAND_SIZE * 4;
/** 王牌14枚のレイアウト: 嶺上牌4 + ドラ表示牌5 + 裏ドラ表示牌5。 */
const RINSHAN_START = HANDS_SIZE + LIVE_WALL_SIZE; // 122
const DORA_START = RINSHAN_START + 4; // 126
const URA_DORA_START = DORA_START + 5; // 131

const SUITS: readonly Suit[] = ["m", "p", "s"];
const RANKS: readonly NumberRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const HONORS: readonly HonorKind[] = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"];

/** 136枚の牌を並び順で1つ作る(シャッフル前)。赤ドラありなら 5m/5p/5s の1枚ずつを赤に置換する。 */
const buildOrderedDeck = (rules: RuleSet): readonly Tile[] => {
  const numberTiles: Tile[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      for (let copy = 0; copy < 4; copy += 1) {
        const red = rules.redDora && rank === 5 && copy === 0;
        numberTiles.push({ kind: "number", suit, rank, red });
      }
    }
  }
  const honorTiles: Tile[] = HONORS.flatMap((honor) =>
    Array.from({ length: 4 }, (): Tile => ({ kind: "honor", honor })),
  );
  return [...numberTiles, ...honorTiles];
};

/** Fisher-Yates シャッフル。決定的 PRNG(mulberry32)を種から進めながら行う。 */
const shuffle = (
  tiles: readonly Tile[],
  seed: number,
): Readonly<{ tiles: readonly Tile[]; nextSeed: number }> => {
  const shuffled = [...tiles];
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const { value, nextSeed } = Prng.step(currentSeed);
    currentSeed = nextSeed;
    const j = Math.floor(value * (i + 1));
    const a = shuffled[i] as Tile;
    const b = shuffled[j] as Tile;
    shuffled[i] = b;
    shuffled[j] = a;
  }
  return { tiles: shuffled, nextSeed: currentSeed };
};

/** ルールに従って136枚の牌山を1つ作り、種から決定的にシャッフルする。 */
const buildShuffled = (
  rules: RuleSet,
  seed: number,
): Readonly<{ wall: readonly Tile[]; nextSeed: number }> => {
  const deck = buildOrderedDeck(rules);
  const { tiles, nextSeed } = shuffle(deck, seed);
  return { wall: tiles, nextSeed };
};

/** 現在ツモ可能な残り枚数(王牌14枚・カンによる繰り入れ分を除く)。 */
const remaining = (state: MatchState): number =>
  LIVE_WALL_SIZE - state.drawIndex - state.kanCount;

/** 次にツモる牌(まだ引かれていない場合のみ有効)。 */
const nextLiveTile = (state: MatchState): Tile => {
  const tile = state.wall[HANDS_SIZE + state.drawIndex];
  if (tile === undefined) {
    throw new Error("牌山が尽きているためツモれない");
  }
  return tile;
};

/** カン成立時に嶺上から引く牌(0始まりの何回目のカンかを渡す)。 */
const rinshanTile = (state: MatchState, kanIndex: number): Tile => {
  const tile = state.wall[RINSHAN_START + kanIndex];
  if (tile === undefined) {
    throw new Error("嶺上牌が存在しない");
  }
  return tile;
};

/** 現在表示されているドラ表示牌(初期1枚+カンごとに1枚、最大5枚)。 */
const doraIndicators = (state: MatchState): readonly Tile[] =>
  state.wall.slice(DORA_START, DORA_START + 1 + state.kanCount);

/** 裏ドラ表示牌(表示牌と同数)。リーチ者の和了時にのみ点数計算へ渡すこと。 */
const uraDoraIndicators = (state: MatchState): readonly Tile[] =>
  state.wall.slice(URA_DORA_START, URA_DORA_START + 1 + state.kanCount);

export const Wall = {
  buildShuffled,
  orderedDeck: buildOrderedDeck,
  remaining,
  nextLiveTile,
  rinshanTile,
  doraIndicators,
  uraDoraIndicators,
  handsSize: HANDS_SIZE,
} as const;
