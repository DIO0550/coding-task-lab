import { PlayerAction } from "@/src/domains/player-action";
import type { CpuLevel } from "@/src/domains/player-config";
import type { RuleConfig } from "@/src/domains/rule-config";
import type { SeatIndex } from "@/src/domains/seat";
import { Shanten, type DiscardEvaluation } from "@/src/domains/shanten";
import { TableView } from "@/src/domains/table-view";
import { Tile } from "@/src/domains/tile";

/**
 * CPU 対局 AI。卓の公開情報と自分の手牌(TableView)だけを見て、合法な行動の中から1つ選ぶ。
 *
 * - 入門: 孤立した字牌・么九牌から切る単純な牌効率。役牌のポンだけ鳴く。テンパイしたら常にリーチ。守備なし
 * - 標準: 向聴数と受け入れ枚数で打牌。役が確定する鳴きのみ。待ちの残り枚数を見てリーチ。他家リーチ時は現物を優先
 * - 上級: 標準に加えドラ・赤を残す打点効率と、危険度評価による降り判断
 */
type Discard = Extract<PlayerAction, { type: "discard" }>;

type Candidate = Readonly<{
  action: Discard;
  evaluation: DiscardEvaluation;
  danger: number;
  doraValue: number;
  isolation: number;
}>;

const RIICHI_MIN_REMAINING_WAITS = 2;
const FOLD_SHANTEN = 2;
const DANGEROUS = 4;

const pick = <T>(items: readonly T[], rng: () => number): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

const isDiscard = (action: PlayerAction): action is Discard => action.type === "discard";

const isYakuhai = (view: TableView, tile: Tile): boolean =>
  Tile.isDragon(tile) || Tile.equals(tile, Tile.ofWind(view.seatWind)) || Tile.equals(tile, Tile.ofWind(view.roundWind));

const doraValue = (view: TableView, tile: Tile): number =>
  TableView.doraTiles(view).filter((dora) => Tile.equals(dora, tile)).length + (Tile.isRed(tile) ? 1 : 0);

/** 孤立度: 小さいほど切りやすい(役牌でない孤立字牌 → 孤立么九牌 → 孤立中張牌 → 連絡のある牌) */
const isolationScore = (view: TableView, tile: Tile, concealed: readonly Tile[]): number => {
  const count = Tile.countOf(concealed, tile);
  if (Tile.isHonor(tile)) return count === 1 ? (isYakuhai(view, tile) ? 1 : 0) : 10 + count;
  const rank = Tile.rank(tile);
  const neighbors = concealed.filter(
    (other) => other !== tile && Tile.isSameSuit(other, tile) && Math.abs(Tile.rank(other) - rank) <= 2,
  ).length;
  const isolated = count === 1 && neighbors === 0;
  const centrality = Math.abs(5 - rank);
  return isolated ? 6 - centrality : 20 - centrality + neighbors;
};

const isSuji = (river: readonly Tile[], tile: Tile): boolean => {
  const rank = Tile.rank(tile);
  const has = (target: number) => river.some((t) => Tile.isSameSuit(t, tile) && Tile.rank(t) === target);
  if (rank <= 3) return has(rank + 3);
  if (rank >= 7) return has(rank - 3);
  return has(rank - 3) && has(rank + 3);
};

/** リーチ者1人に対する危険度(0=現物) */
const dangerAgainst = (view: TableView, tile: Tile, threat: SeatIndex): number => {
  const river = TableView.riverOf(view, threat);
  if (river.some((t) => Tile.equals(t, tile))) return 0;
  const visible = view.visibleCounts[Tile.toIndex(tile)];
  if (Tile.isHonor(tile)) return visible >= 3 ? 1 : visible === 2 ? 2 : 4;
  const suji = isSuji(river, tile);
  if (Tile.isTerminal(tile)) return suji ? 2 : 4;
  const rank = Tile.rank(tile);
  if (rank === 2 || rank === 8) return suji ? 3 : 5;
  return suji ? 4 : 6;
};

const threatsOf = (view: TableView): readonly SeatIndex[] => view.riichiSeats.filter((seat) => seat !== view.seat);

const candidatesOf = (view: TableView, discards: readonly Discard[]): readonly Candidate[] => {
  const concealed = view.drawnTile === null ? view.hand : [...view.hand, view.drawnTile];
  const evaluations = Shanten.evaluateDiscards(concealed, view.melds.length, view.visibleCounts);
  const threats = threatsOf(view);
  return discards.flatMap((action) => {
    const evaluation = evaluations.find((e) => e.tile === action.tile);
    if (evaluation === undefined) return [];
    const danger = Math.max(0, ...threats.map((threat) => dangerAgainst(view, action.tile, threat)));
    return [
      {
        action,
        evaluation,
        danger,
        doraValue: doraValue(view, action.tile),
        isolation: isolationScore(view, action.tile, concealed),
      },
    ];
  });
};

const bestBy = (candidates: readonly Candidate[], score: (c: Candidate) => number, rng: () => number): Candidate => {
  const best = Math.min(...candidates.map(score));
  return pick(
    candidates.filter((c) => score(c) === best),
    rng,
  );
};

/** 向聴数 → 受け入れ枚数 → 孤立度 の順で評価した打牌 */
const efficiencyScore = (c: Candidate): number => c.evaluation.shanten * 10000 - c.evaluation.ukeire * 100 + c.isolation;

const beginnerScore = (c: Candidate): number => c.evaluation.shanten * 10000 + c.isolation;

const advancedScore = (c: Candidate): number => efficiencyScore(c) * 10 + c.doraValue * 5;

const chooseDiscard = (view: TableView, discards: readonly Discard[], level: CpuLevel, rng: () => number): PlayerAction => {
  const candidates = candidatesOf(view, discards);
  if (candidates.length === 0) return pick(discards, rng);
  const currentShanten = Math.min(...candidates.map((c) => c.evaluation.shanten));
  const threatened = threatsOf(view).length > 0;
  if (level === "beginner") return bestBy(candidates, beginnerScore, rng).action;
  if (level === "standard") {
    const safe = candidates.filter((c) => c.danger === 0);
    const pool = threatened && currentShanten >= 1 && safe.length > 0 ? safe : candidates;
    return bestBy(pool, efficiencyScore, rng).action;
  }
  if (threatened && currentShanten >= FOLD_SHANTEN) {
    return bestBy(candidates, (c) => c.danger * 1000 + efficiencyScore(c) / 100, rng).action;
  }
  if (threatened && currentShanten === 1) {
    const efficient = candidates.filter((c) => c.evaluation.shanten === currentShanten);
    const safest = bestBy(efficient, (c) => c.danger, rng);
    const safe = candidates.filter((c) => c.danger === 0);
    return safest.danger >= DANGEROUS && safe.length > 0 ? bestBy(safe, efficiencyScore, rng).action : safest.action;
  }
  return bestBy(candidates, (c) => advancedScore(c) + (threatened ? c.danger : 0), rng).action;
};

/** リーチ宣言牌ごとの待ちの残り枚数 */
const remainingWaits = (view: TableView, discard: Discard): number => {
  const concealed = view.drawnTile === null ? view.hand : [...view.hand, view.drawnTile];
  const rest = Tile.removeOne(concealed, discard.tile);
  return Shanten.ukeire(rest, view.melds.length, view.visibleCounts).total;
};

const chooseRiichi = (view: TableView, riichiDiscards: readonly Discard[], level: CpuLevel, rng: () => number): PlayerAction | undefined => {
  const scored = riichiDiscards.map((action) => ({ action, remaining: remainingWaits(view, action) }));
  const best = Math.max(...scored.map((entry) => entry.remaining));
  const chosen = pick(
    scored.filter((entry) => entry.remaining === best),
    rng,
  ).action;
  if (level === "beginner" || best >= RIICHI_MIN_REMAINING_WAITS) return chosen;
  return undefined;
};

const decideTurn = (view: TableView, actions: readonly PlayerAction[], level: CpuLevel, rng: () => number): PlayerAction => {
  const kan = actions.find((action) => action.type === "kan");
  if (kan !== undefined && (level === "beginner" || threatsOf(view).length === 0)) return kan;
  const riichiDiscards = actions.filter(isDiscard).filter((action) => action.riichi);
  const riichi = riichiDiscards.length > 0 ? chooseRiichi(view, riichiDiscards, level, rng) : undefined;
  if (riichi !== undefined) return riichi;
  const discards = actions.filter(isDiscard).filter((action) => !action.riichi);
  if (discards.length === 0) return pick(actions, rng);
  return chooseDiscard(view, discards, level, rng);
};

type CallOption = Extract<PlayerAction, { type: "pon" | "chi" }>;

const isCallOption = (action: PlayerAction): action is CallOption => action.type === "pon" || action.type === "chi";

const allTilesAfterCall = (view: TableView, option: CallOption, called: Tile): readonly Tile[] => [
  ...view.hand,
  ...view.melds.flatMap((meld) => meld.tiles),
  called,
];

/** 鳴いた後も役が確定しているか(役牌・喰いタン・混一色/清一色) */
const keepsYaku = (view: TableView, option: CallOption, called: Tile, rules: RuleConfig): boolean => {
  const hasYakuhaiMeld = view.melds.some((meld) => meld.type !== "chi" && isYakuhai(view, meld.tiles[0]));
  if (hasYakuhaiMeld || (option.type === "pon" && isYakuhai(view, called))) return true;
  const all = allTilesAfterCall(view, option, called);
  if (rules.kuitan && all.every((tile) => Tile.isSimple(tile))) return true;
  const suits = new Set(all.filter((tile) => !Tile.isHonor(tile)).map((tile) => Tile.suit(tile)));
  return suits.size <= 1;
};

/** 鳴いた後に1枚切った時点の向聴数(鳴いた直後は必ず打牌するため、和了形(-1)にはならない) */
const shantenAfterCall = (view: TableView, option: CallOption): number => {
  const rest = option.tiles.reduce<readonly Tile[]>((tiles, tile) => Tile.removeOne(tiles, tile), view.hand);
  return Math.max(Shanten.calculate(rest, view.melds.length + 1), 0);
};

const decideCall = (
  view: TableView,
  actions: readonly PlayerAction[],
  level: CpuLevel,
  rules: RuleConfig,
  rng: () => number,
): PlayerAction => {
  const pass = actions.find((action) => action.type === "pass") ?? pick(actions, rng);
  const called = view.phase.type === "call" ? view.phase.tile : null;
  if (called === null) return pass;
  const options = actions.filter(isCallOption);
  if (level === "beginner") {
    return options.find((option) => option.type === "pon" && isYakuhai(view, called)) ?? pass;
  }
  const before = Shanten.calculate(view.hand, view.melds.length);
  if (level === "advanced" && threatsOf(view).length > 0 && before >= FOLD_SHANTEN) return pass;
  const improving = options
    .map((option) => ({ option, after: shantenAfterCall(view, option) }))
    .filter((entry) => entry.after < before && keepsYaku(view, entry.option, called, rules));
  if (improving.length === 0) return pass;
  const best = Math.min(...improving.map((entry) => entry.after));
  return pick(
    improving.filter((entry) => entry.after === best),
    rng,
  ).option;
};

export const CpuAi = {
  decide(
    view: TableView,
    actions: readonly PlayerAction[],
    level: CpuLevel,
    rules: RuleConfig,
    rng: () => number,
  ): PlayerAction {
    const win = actions.find((action) => PlayerAction.isWin(action));
    if (win !== undefined) return win;
    if (actions.some((action) => action.type === "pass")) return decideCall(view, actions, level, rules, rng);
    return decideTurn(view, actions, level, rng);
  },
} as const;
