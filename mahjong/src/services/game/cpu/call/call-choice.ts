import { Hand, TENPAI_SHANTEN } from "../../../../domains/hand/index.ts";
import { Meld } from "../../../../domains/meld/index.ts";
import type { CpuLevel } from "../../../../domains/participant/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import type { GameAction, GameActionType } from "../../action/index.ts";
import type { ClaimView, PlayerView } from "../../view/index.ts";
import { TableInfo } from "../table/index.ts";
import { HandValue } from "../value/index.ts";

/** 他家の打牌に対する鳴き。 */
type CallAction = Extract<GameAction, { type: "pon" | "minkan" | "chi" }>;

/** 自分の手番での槓。 */
type KanAction = Extract<GameAction, { type: "ankan" | "kakan" }>;

type CallEvaluation = Readonly<{
  action: CallAction;
  /** 鳴いた後の手牌。 */
  hand: Hand;
  /** 鳴いた後のシャンテン数。 */
  shanten: number;
  /** 手の進み具合と打点を合わせた評価。 */
  score: number;
}>;

/** シャンテン数が1つ進むことの価値。 */
const PROGRESS_WEIGHT = 10;

/** 同じ評価なら鳴く順(ポン→大明槓→チー)。 */
const CALL_ORDER: readonly GameActionType[] = ["pon", "minkan", "chi"];

/** 同じ条件なら槓する順(暗槓→加槓)。 */
const KAN_ORDER: readonly GameActionType[] = ["ankan", "kakan"];

const isCallAction = (action: GameAction): action is CallAction =>
  action.type === "pon" || action.type === "minkan" || action.type === "chi";

const isKanAction = (action: GameAction): action is KanAction =>
  action.type === "ankan" || action.type === "kakan";

const meldOf = (action: CallAction, claim: ClaimView): Meld => {
  const tiles = [...action.tiles, claim.tile];
  if (action.type === "pon") {
    return Meld.pon(tiles, claim.from);
  }
  if (action.type === "minkan") {
    return Meld.minkan(tiles, claim.from);
  }
  return Meld.chi(tiles, claim.from);
};

const handAfterCall = (
  hand: Hand,
  action: CallAction,
  claim: ClaimView,
): Hand => Hand.addMeld(hand, meldOf(action, claim), action.tiles);

const handAfterKan = (hand: Hand, action: KanAction): Hand => {
  if (action.type === "kakan") {
    return Hand.remove(hand, action.tile);
  }
  const tiles = hand.concealed.filter((tile) =>
    Tile.isSameKind(tile, action.tile),
  );
  return Hand.addMeld(hand, Meld.ankan(tiles), tiles);
};

/** 大明槓してよい打点があるか。 */
const isValuableKan = (info: TableInfo, tile: Tile): boolean =>
  TableInfo.isDora(info, tile) || TableInfo.isValueTile(info, tile);

const evaluateCall = (
  view: PlayerView,
  info: TableInfo,
  action: CallAction,
  claim: ClaimView,
  before: number,
): CallEvaluation => {
  const hand = handAfterCall(view.hand, action, claim);
  const shanten = Hand.shanten(hand);
  return {
    action,
    hand,
    shanten,
    score:
      (before - shanten) * PROGRESS_WEIGHT + HandValue.estimate(hand, info),
  };
};

const isAcceptableCall = (
  info: TableInfo,
  evaluation: CallEvaluation,
  claim: ClaimView,
  before: number,
  defending: boolean,
): boolean => {
  if (defending && evaluation.shanten > TENPAI_SHANTEN) {
    return false;
  }
  if (!HandValue.hasYakuProspect(evaluation.hand, info)) {
    return false;
  }
  if (evaluation.action.type === "minkan") {
    return isValuableKan(info, claim.tile) && evaluation.shanten <= before;
  }
  return evaluation.shanten < before;
};

const compareCalls = (left: CallEvaluation, right: CallEvaluation): number => {
  const score = right.score - left.score;
  if (score !== 0) {
    return score;
  }
  return (
    CALL_ORDER.indexOf(left.action.type) - CALL_ORDER.indexOf(right.action.type)
  );
};

const bestCall = (
  evaluations: readonly CallEvaluation[],
): GameAction | null => {
  const chosen = evaluations.reduce<CallEvaluation | null>(
    (best, evaluation) => {
      if (best === null) {
        return evaluation;
      }
      return compareCalls(evaluation, best) < 0 ? evaluation : best;
    },
    null,
  );
  return chosen === null ? null : chosen.action;
};

/** 入門: 役牌の刻子になるポンだけを鳴く。 */
const beginnerCall = (
  view: PlayerView,
  info: TableInfo,
  claim: ClaimView,
): GameAction | null => {
  if (!TableInfo.isValueTile(info, claim.tile)) {
    return null;
  }
  const pon = view.actions
    .filter(isCallAction)
    .find((action) => action.type === "pon");
  if (pon === undefined) {
    return null;
  }
  const after = handAfterCall(view.hand, pon, claim);
  return Hand.shanten(after) <= Hand.shanten(view.hand) ? pon : null;
};

/** 標準・上級: シャンテン数が進み、かつ役と打点が見込める鳴きだけを選ぶ。 */
const valueCall = (
  view: PlayerView,
  level: CpuLevel,
  info: TableInfo,
  claim: ClaimView,
): GameAction | null => {
  const before = Hand.shanten(view.hand);
  const defending = level === "advanced" && TableInfo.hasThreat(info);
  const accepted = view.actions
    .filter(isCallAction)
    .map((action) => evaluateCall(view, info, action, claim, before))
    .filter((evaluation) =>
      isAcceptableCall(info, evaluation, claim, before, defending),
    );
  return bestCall(accepted);
};

const compareKans = (left: KanAction, right: KanAction): number => {
  const order = KAN_ORDER.indexOf(left.type) - KAN_ORDER.indexOf(right.type);
  if (order !== 0) {
    return order;
  }
  return Tile.toIndex(left.tile) - Tile.toIndex(right.tile);
};

const bestKan = (actions: readonly KanAction[]): GameAction | null =>
  actions.reduce<KanAction | null>((best, action) => {
    if (best === null) {
      return action;
    }
    return compareKans(action, best) < 0 ? action : best;
  }, null);

/** 他家のリーチ中に、テンパイしていない手で槓を避けるか。 */
const avoidsKan = (
  level: CpuLevel,
  info: TableInfo,
  shanten: number,
): boolean =>
  level !== "beginner" &&
  TableInfo.hasThreat(info) &&
  shanten > TENPAI_SHANTEN;

export const CallChoice = {
  /** 他家の打牌に対する鳴きを決める。鳴かないなら null。 */
  chooseClaim(
    view: PlayerView,
    level: CpuLevel,
    info: TableInfo,
  ): GameAction | null {
    const claim = view.claim;
    if (claim === null) {
      return null;
    }
    if (level === "beginner") {
      return beginnerCall(view, info, claim);
    }
    return valueCall(view, level, info, claim);
  },

  /** 自分の手番での槓を決める。槓しないなら null。 */
  chooseKan(
    view: PlayerView,
    level: CpuLevel,
    info: TableInfo,
  ): GameAction | null {
    const kans = view.actions.filter(isKanAction);
    if (kans.length === 0) {
      return null;
    }
    const before = Hand.shanten(view.hand);
    if (avoidsKan(level, info, before)) {
      return null;
    }
    return bestKan(
      kans.filter(
        (action) => Hand.shanten(handAfterKan(view.hand, action)) <= before,
      ),
    );
  },
} as const;
