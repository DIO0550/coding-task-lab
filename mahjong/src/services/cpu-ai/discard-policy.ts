import { Hand } from "../../domains/hand/index.ts";
import type { CpuLevel, GameView } from "../../domains/game/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { NumberRank, Tile as TileType } from "../../domains/tile/index.ts";
import { buildCounts34, computeVisibleCounts, removeOneMatching } from "./tile-helpers.ts";

/**
 * Hand.shanten は同じ牌の多重集合であれば常に同じ結果を返す(赤・並び順は結果に影響しない)。
 * 打牌候補×34種の総当たりでは同じ牌の多重集合を何度も評価しがちなので、1回の評価呼び出し内で
 * 結果をキャッシュして Hand.shanten の呼び出し回数を減らす。
 */
const shantenCached = (
  tiles: readonly TileType[],
  meldCount: number,
  cache: Map<string, number>,
): number => {
  const key = `${meldCount}|${buildCounts34(tiles).join(",")}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const shanten = Hand.shanten(tiles, meldCount);
  cache.set(key, shanten);
  return shanten;
};

/** 牌が「孤立牌」か(同種2枚目が無く、数牌なら前後2階級以内に受け入れ材料が無い)。 */
const isIsolated = (tile: TileType, poolCounts: readonly number[]): boolean => {
  const index = Tile.toIndex34(tile);
  if ((poolCounts[index] ?? 0) >= 2) {
    return false;
  }
  if (tile.kind === "honor") {
    return true;
  }
  for (let delta = -2; delta <= 2; delta += 1) {
    if (delta === 0) {
      continue;
    }
    const rank = tile.rank + delta;
    if (rank < 1 || rank > 9) {
      continue;
    }
    const neighborIndex = Tile.toIndex34({ kind: "number", suit: tile.suit, rank: rank as NumberRank, red: false });
    if ((poolCounts[neighborIndex] ?? 0) > 0) {
      return false;
    }
  }
  return true;
};

/**
 * 入門レベルの切り優先度: 孤立字牌(0) → 孤立19牌(1) → 孤立中張牌(2) → それ以外(3)。
 * 数値が小さいほど先に切る。
 */
const beginnerPriority = (tile: TileType, poolCounts: readonly number[]): number => {
  if (!isIsolated(tile, poolCounts)) {
    return 3;
  }
  if (tile.kind === "honor") {
    return 0;
  }
  return Tile.isTerminal(tile) ? 1 : 2;
};

/** 入門レベルの打牌選択: シャンテン数を悪化させない範囲で、単純牌効率(孤立牌優先)に従う。 */
const chooseBeginnerDiscard = (view: GameView, candidates: readonly TileType[]): TileType => {
  const pool = view.drawnTile !== null ? [...view.hand, view.drawnTile] : view.hand;
  const meldCount = view.players[view.seat]?.melds.length ?? 0;
  const poolCounts = buildCounts34(pool);

  const scored = candidates.map((tile) => ({
    tile,
    shanten: Hand.shanten(removeOneMatching(pool, tile), meldCount),
    priority: beginnerPriority(tile, poolCounts),
  }));
  const minShanten = Math.min(...scored.map((s) => s.shanten));
  const atMinShanten = scored.filter((s) => s.shanten === minShanten);
  const minPriority = Math.min(...atMinShanten.map((s) => s.priority));
  const best = atMinShanten
    .filter((s) => s.priority === minPriority)
    .map((s) => s.tile)
    .toSorted(Tile.compare);

  const chosen = best[0];
  if (chosen === undefined) {
    throw new Error("打牌候補が空の状態でCpuAiが打牌を選ぼうとした");
  }
  return chosen;
};

export type DiscardEvaluation = Readonly<{
  tile: TileType;
  shanten: number;
  ukeire: number;
  isDora: boolean;
}>;

/**
 * 打牌候補ごとに「切った後のシャンテン数」と「受け入れ枚数(残り牌数)」を評価する。
 * 受け入れ枚数は 34 種を1周して、切った後の手が引くことでシャンテンが進む牌の残り枚数を合計する
 * (打牌候補ごとに34種を1周するのみで、候補×候補のようなネストはしない)。
 *
 * Hand.shanten の呼び出しは(手の形によっては)軽くないため、まずシャンテン数だけを
 * 全候補について求め(候補数回のみ)、実際に採用され得る「最小シャンテンの候補」に対してのみ
 * 34種の受け入れ枚数スキャンを行う(最小シャンテンでない候補はどのみち選ばれないため)。
 */
export const evaluateDiscardCandidates = (
  view: GameView,
  candidates: readonly TileType[],
): readonly DiscardEvaluation[] => {
  const pool = view.drawnTile !== null ? [...view.hand, view.drawnTile] : view.hand;
  const meldCount = view.players[view.seat]?.melds.length ?? 0;
  const doraKinds = view.doraIndicators.map(Tile.nextInSeries);
  const shantenCache = new Map<string, number>();

  const withShanten = candidates.map((tile) => {
    const afterDiscard = removeOneMatching(pool, tile);
    const isDora = doraKinds.some((d) => Tile.equals(d, tile)) || (tile.kind === "number" && tile.red);
    return { tile, afterDiscard, shanten: shantenCached(afterDiscard, meldCount, shantenCache), isDora };
  });
  const minShanten = Math.min(...withShanten.map((e) => e.shanten));

  const visible = computeVisibleCounts(view);
  const allKinds = Tile.allKinds();

  return withShanten.map(({ tile, afterDiscard, shanten, isDora }) => {
    if (shanten !== minShanten) {
      return { tile, shanten, ukeire: 0, isDora };
    }

    let ukeire = 0;
    for (const kind of allKinds) {
      const index = Tile.toIndex34(kind);
      const remaining = Math.max(0, 4 - (visible[index] ?? 0));
      if (remaining === 0) {
        continue;
      }
      const shantenAfterDraw = shantenCached([...afterDiscard, kind], meldCount, shantenCache);
      if (shantenAfterDraw < shanten) {
        ukeire += remaining;
      }
    }

    return { tile, shanten, ukeire, isDora };
  });
};

/** シャンテン数最小 → 受け入れ枚数最大 の順で最良の候補を選ぶ。 */
const pickBestEfficiency = (evaluations: readonly DiscardEvaluation[]): TileType => {
  const minShanten = Math.min(...evaluations.map((e) => e.shanten));
  const atMinShanten = evaluations.filter((e) => e.shanten === minShanten);
  const maxUkeire = Math.max(...atMinShanten.map((e) => e.ukeire));
  const best = atMinShanten
    .filter((e) => e.ukeire === maxUkeire)
    .map((e) => e.tile)
    .toSorted(Tile.compare);
  const chosen = best[0];
  if (chosen === undefined) {
    throw new Error("打牌候補が空の状態でCpuAiが打牌を選ぼうとした");
  }
  return chosen;
};

/** シャンテン数最小 → 受け入れ枚数最大 → 同値ならドラ以外を優先して切る、の順で選ぶ(上級用)。 */
const pickBestEfficiencyWithDora = (evaluations: readonly DiscardEvaluation[]): TileType => {
  const minShanten = Math.min(...evaluations.map((e) => e.shanten));
  const atMinShanten = evaluations.filter((e) => e.shanten === minShanten);
  const maxUkeire = Math.max(...atMinShanten.map((e) => e.ukeire));
  const tied = atMinShanten.filter((e) => e.ukeire === maxUkeire);
  const nonDora = tied.filter((e) => !e.isDora);
  const pool = nonDora.length > 0 ? nonDora : tied;
  const best = pool.map((e) => e.tile).toSorted(Tile.compare);
  const chosen = best[0];
  if (chosen === undefined) {
    throw new Error("打牌候補が空の状態でCpuAiが打牌を選ぼうとした");
  }
  return chosen;
};

/** リーチ中の他家(自分以外)一覧。 */
const riichiOpponents = (view: GameView): readonly GameView["players"][number][] =>
  view.players.filter((p) => p.seat !== view.seat && p.riichi !== "none");

/** tile が全ての riichi 中の他家に対して現物(河にある牌)か。 */
const isGenbutsuAgainstAll = (
  tile: TileType,
  opponents: readonly GameView["players"][number][],
): boolean => opponents.every((p) => p.river.some((r) => Tile.equals(r.tile, tile)));

/** 標準レベルの打牌選択: 他家リーチ時は現物を優先し、無ければシャンテン+受け入れ枚数で選ぶ。 */
const chooseStandardDiscard = (view: GameView, candidates: readonly TileType[]): TileType => {
  const opponents = riichiOpponents(view);
  const evaluations = evaluateDiscardCandidates(view, candidates);

  if (opponents.length > 0) {
    const safeTiles = candidates.filter((tile) => isGenbutsuAgainstAll(tile, opponents));
    if (safeTiles.length > 0) {
      const safeEvaluations = evaluations.filter((e) => safeTiles.some((t) => Tile.equals(t, e.tile)));
      return pickBestEfficiency(safeEvaluations);
    }
  }

  return pickBestEfficiency(evaluations);
};

const NUMBER_SUJI_DISTANCE = 3;

/** river の中に、tile と同色でランクが ±3 の牌があるか(両面待ちに対するスジ)。 */
const hasSujiCover = (tile: TileType, river: GameView["players"][number]["river"]): boolean => {
  if (tile.kind !== "number") {
    return false;
  }
  return river.some((r) => {
    const t = r.tile;
    return (
      t.kind === "number" &&
      t.suit === tile.suit &&
      Math.abs(t.rank - tile.rank) === NUMBER_SUJI_DISTANCE
    );
  });
};

/** tile を opponent に対して切ったときの危険度(0=最も安全)。 */
const dangerTierAgainst = (
  tile: TileType,
  opponent: GameView["players"][number],
  visible: readonly number[],
): number => {
  if (opponent.river.some((r) => Tile.equals(r.tile, tile))) {
    return 0;
  }
  if (tile.kind === "honor") {
    const visibleCount = visible[Tile.toIndex34(tile)] ?? 0;
    return visibleCount >= 3 ? 1 : 3;
  }
  if (hasSujiCover(tile, opponent.river)) {
    return 2;
  }
  if (Tile.isTerminal(tile)) {
    return 3;
  }
  return 4;
};

/** 複数の他家がリーチしている場合、最も危険な相手を基準にした危険度(悪い方=大きい方を採用)。 */
const overallDangerTier = (
  tile: TileType,
  opponents: readonly GameView["players"][number][],
  visible: readonly number[],
): number => Math.max(...opponents.map((p) => dangerTierAgainst(tile, p, visible)));

/** 最も安全な牌(危険度最小)を選ぶ。同値なら決定的な順で選ぶ。 */
const pickSafestTile = (
  view: GameView,
  candidates: readonly TileType[],
  opponents: readonly GameView["players"][number][],
): TileType => {
  const visible = computeVisibleCounts(view);
  const scored = candidates.map((tile) => ({ tile, tier: overallDangerTier(tile, opponents, visible) }));
  const minTier = Math.min(...scored.map((s) => s.tier));
  const best = scored
    .filter((s) => s.tier === minTier)
    .map((s) => s.tile)
    .toSorted(Tile.compare);
  const chosen = best[0];
  if (chosen === undefined) {
    throw new Error("打牌候補が空の状態でCpuAiが打牌を選ぼうとした");
  }
  return chosen;
};

/**
 * 上級レベルの打牌選択: 他家リーチ時、自手が2シャンテン以上なら最も安全な牌に降りる。
 * テンパイ・1シャンテンなら押し(ドラを考慮した効率打牌)。リーチが無ければ常に効率打牌。
 */
const chooseAdvancedDiscard = (view: GameView, candidates: readonly TileType[]): TileType => {
  const opponents = riichiOpponents(view);
  const evaluations = evaluateDiscardCandidates(view, candidates);

  if (opponents.length > 0) {
    const ownShanten = Math.min(...evaluations.map((e) => e.shanten));
    if (ownShanten >= 2) {
      return pickSafestTile(view, candidates, opponents);
    }
  }

  return pickBestEfficiencyWithDora(evaluations);
};

export const chooseDiscard = (view: GameView, level: CpuLevel, candidates: readonly TileType[]): TileType => {
  if (level === "beginner") {
    return chooseBeginnerDiscard(view, candidates);
  }
  if (level === "standard") {
    return chooseStandardDiscard(view, candidates);
  }
  return chooseAdvancedDiscard(view, candidates);
};
