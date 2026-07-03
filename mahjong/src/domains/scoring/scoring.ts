import { Fu } from "../fu/index.ts";
import type { Decomposition } from "../hand/index.ts";
import { Hand } from "../hand/index.ts";
import { Meld } from "../meld/index.ts";
import { Score } from "../score/index.ts";
import { Tile } from "../tile/index.ts";
import type { WinContext } from "../win-context/index.ts";
import type { YakuHit, YakumanHit } from "../yaku/index.ts";
import { Yaku } from "../yaku/index.ts";
import type { ScoreInput, ScoreResult } from "./types.ts";

type YakuEntry = Readonly<{ name: string; han: number }>;

type Candidate = Readonly<{
  yaku: readonly YakuEntry[];
  han: number;
  fu: number;
  score: Readonly<{ total: number; payments: ReturnType<typeof Score.calculate>["payments"] }>;
}>;

const buildContext = (input: ScoreInput): WinContext => ({
  winTile: input.winTile,
  winType: input.winType,
  seatWind: input.seatWind,
  roundWind: input.roundWind,
  riichi: input.riichi,
  ippatsu: input.ippatsu,
  situational: input.situational,
  melds: input.melds,
  isMenzen: input.melds.every((m) => !Meld.isOpen(m)),
  rules: { kuitan: input.rules.kuitan },
});

const allPhysicalTiles = (input: ScoreInput): readonly Tile[] => [
  ...input.hand,
  ...input.melds.flatMap((m) => m.tiles),
];

/** dora 牌1枚について、対象牌集合との一致数(赤同一視)を合計する。 */
const countMatches = (doraTile: Tile, tiles: readonly Tile[]): number =>
  tiles.filter((t) => Tile.equals(t, doraTile)).length;

const countDoraHan = (doraList: readonly Tile[], tiles: readonly Tile[]): number =>
  doraList.reduce((sum, doraTile) => sum + countMatches(doraTile, tiles), 0);

const countAkaDoraHan = (tiles: readonly Tile[]): number =>
  tiles.filter((t) => t.kind === "number" && t.red).length;

const buildDoraEntries = (input: ScoreInput, ctx: WinContext): readonly YakuEntry[] => {
  const tiles = allPhysicalTiles(input);
  const entries: YakuEntry[] = [];

  const doraHan = countDoraHan(input.dora, tiles);
  if (doraHan > 0) {
    entries.push({ name: "dora", han: doraHan });
  }

  if (ctx.riichi !== "none") {
    const uraDoraHan = countDoraHan(input.uraDora, tiles);
    if (uraDoraHan > 0) {
      entries.push({ name: "ura_dora", han: uraDoraHan });
    }
  }

  if (input.rules.redDora) {
    const akaDoraHan = countAkaDoraHan(tiles);
    if (akaDoraHan > 0) {
      entries.push({ name: "aka_dora", han: akaDoraHan });
    }
  }

  return entries;
};

const buildNormalCandidate = (
  d: Decomposition,
  ctx: WinContext,
  input: ScoreInput,
  normal: readonly YakuHit[],
): Candidate => {
  const doraEntries = buildDoraEntries(input, ctx);
  const yaku: readonly YakuEntry[] = [...normal, ...doraEntries];
  const han = yaku.reduce((sum, hit) => sum + hit.han, 0);
  const isPinfu = normal.some((hit) => hit.name === "pinfu");
  const fu = Fu.calculate(d, ctx, { isPinfu });

  const { total, payments } = Score.calculate({
    han,
    fu,
    isDealer: input.seatWind === "ton",
    winType: input.winType,
    honba: input.honba,
    kyotaku: input.kyotaku,
    yakumanMultiplier: 0,
  });

  return { yaku, han, fu, score: { total, payments } };
};

const buildYakumanCandidate = (
  d: Decomposition,
  ctx: WinContext,
  input: ScoreInput,
  yakuman: readonly YakumanHit[],
): Candidate => {
  const rankSum = yakuman.reduce((sum, hit) => sum + hit.rank, 0);
  const multiplier = Math.min(rankSum, 2);
  const yaku: readonly YakuEntry[] = yakuman.map((hit) => ({ name: hit.name, han: 13 * hit.rank }));
  const han = 13 * multiplier;
  const fu = Fu.calculate(d, ctx, { isPinfu: false });

  const { total, payments } = Score.calculate({
    han,
    fu,
    isDealer: input.seatWind === "ton",
    winType: input.winType,
    honba: input.honba,
    kyotaku: input.kyotaku,
    yakumanMultiplier: multiplier,
  });

  return { yaku, han, fu, score: { total, payments } };
};

/** 高点法: total 最大 → han 大 → fu 大の順で優先する解釈を選ぶ。 */
const pickBest = (candidates: readonly Candidate[]): Candidate =>
  candidates.reduce((best, current) => {
    if (current.score.total !== best.score.total) {
      return current.score.total > best.score.total ? current : best;
    }
    if (current.han !== best.han) {
      return current.han > best.han ? current : best;
    }
    return current.fu > best.fu ? current : best;
  });

const buildCandidate = (d: Decomposition, ctx: WinContext, input: ScoreInput): Candidate | null => {
  const { yakuman, normal } = Yaku.detect(d, ctx);
  if (yakuman.length > 0) {
    return buildYakumanCandidate(d, ctx, input, yakuman);
  }
  if (normal.length === 0) {
    return null;
  }
  return buildNormalCandidate(d, ctx, input, normal);
};

const calculate = (input: ScoreInput): ScoreResult => {
  const decompositions = Hand.decompose({
    concealed: input.hand,
    melds: input.melds,
    winTile: input.winTile,
    winType: input.winType,
  });
  if (decompositions.length === 0) {
    return { valid: false, reason: "not_winning_hand" };
  }

  const ctx = buildContext(input);
  const candidates = decompositions
    .map((d) => buildCandidate(d, ctx, input))
    .filter((c): c is Candidate => c !== null);

  if (candidates.length === 0) {
    return { valid: false, reason: "no_yaku" };
  }

  const best = pickBest(candidates);
  return { valid: true, yaku: best.yaku, han: best.han, fu: best.fu, score: best.score };
};

export const Scoring = { calculate } as const;
