import { Hand } from "../hand/index.ts";
import type { Action, CpuLevel, PlayerView } from "../game/index.ts";
import { ViewInfo } from "./view-info.ts";
import { Safety } from "./safety.ts";
import { Evaluate, selectBest, tileSortKey } from "./evaluate.ts";
import type { Criterion, DiscardCandidate } from "./evaluate.ts";
import { Calls } from "./calls.ts";

/** 上級が他家リーチに押してよいと判断する打点目安(ドラ相当+面前ボーナス) */
const PUSH_MIN_VALUE = 2;
/** リーチ宣言に必要な待ちの未見枚数(標準・上級。枯れた待ちでは宣言しない) */
const RIICHI_MIN_WAIT_SCORE = 1;

const TENPAI_SHANTEN = 0;

const candidateKey = (candidate: DiscardCandidate): string =>
  tileSortKey(candidate.tile);

/** シャンテン最小 → 不要牌優先(入門の単純牌効率) */
const beginnerCriteria = (
  info: ViewInfo,
): readonly Criterion<DiscardCandidate>[] => [
  { score: (candidate) => candidate.shanten, prefer: "min" },
  { score: (candidate) => Evaluate.uselessness(info, candidate), prefer: "max" },
];

/** シャンテン最小 → 受け入れ最大 → 不要牌優先(標準) */
const standardCriteria = (
  info: ViewInfo,
): readonly Criterion<DiscardCandidate>[] => [
  { score: (candidate) => candidate.shanten, prefer: "min" },
  { score: (candidate) => Evaluate.acceptanceScore(info, candidate), prefer: "max" },
  { score: (candidate) => Evaluate.uselessness(info, candidate), prefer: "max" },
];

/** 標準に加えドラ・赤を手に残す(上級の打点効率) */
const advancedCriteria = (
  info: ViewInfo,
): readonly Criterion<DiscardCandidate>[] => [
  { score: (candidate) => candidate.shanten, prefer: "min" },
  { score: (candidate) => Evaluate.acceptanceScore(info, candidate), prefer: "max" },
  { score: (candidate) => Evaluate.valueLoss(info, candidate), prefer: "min" },
  { score: (candidate) => Evaluate.uselessness(info, candidate), prefer: "max" },
];

/** ベタ降り: 危険度最小 → 手の形はできるだけ保つ(上級の降り) */
const foldCriteria = (
  info: ViewInfo,
): readonly Criterion<DiscardCandidate>[] => [
  { score: (candidate) => Safety.danger(info, candidate.tile), prefer: "min" },
  { score: (candidate) => candidate.shanten, prefer: "min" },
  { score: (candidate) => Evaluate.acceptanceScore(info, candidate), prefer: "max" },
  { score: (candidate) => Evaluate.valueLoss(info, candidate), prefer: "min" },
  { score: (candidate) => Evaluate.uselessness(info, candidate), prefer: "max" },
];

const efficiencyCriteria = (
  info: ViewInfo,
  level: CpuLevel,
): readonly Criterion<DiscardCandidate>[] => {
  if (level === "beginner") {
    return beginnerCriteria(info);
  }
  if (level === "standard") {
    return standardCriteria(info);
  }
  return advancedCriteria(info);
};

/**
 * 上級の押し判断: いまテンパイ(打牌でテンパイを保てる)かつ
 * 打点の目安(ドラ・赤+面前ならリーチ分)が基準以上なら押す
 */
const shouldPush = (info: ViewInfo): boolean =>
  Hand.shanten(info.concealed, info.meldCount) <= TENPAI_SHANTEN &&
  ViewInfo.doraValue(info) + (info.menzen ? 1 : 0) >= PUSH_MIN_VALUE;

/** 手牌に全リーチ者への現物があるか */
const hasGenbutsuInHand = (info: ViewInfo): boolean =>
  info.concealed.some((tile) => Safety.isGenbutsu(info, tile));

/**
 * リーチ宣言の判断。宣言するなら legalActions のリーチ行動を返す。
 * 入門: テンパイしたら常に宣言。
 * 標準: 待ちが枯れていれば宣言しない。他家リーチ時に現物があれば降りる。
 * 上級: 標準に加え、押す価値がなければ宣言せず降りる
 */
const chooseRiichi = (info: ViewInfo, level: CpuLevel): Action | null => {
  const candidates = Evaluate.riichiCandidates(info);
  if (candidates.length === 0) {
    return null;
  }
  if (level !== "beginner" && info.riichiOpponents.length > 0) {
    if (level === "standard" && hasGenbutsuInHand(info)) {
      return null;
    }
    if (level === "advanced" && !shouldPush(info)) {
      return null;
    }
  }
  const scored = candidates.map((candidate) => ({
    candidate,
    waitScore: Evaluate.waitScore(info, candidate),
  }));
  const best = selectBest(
    scored,
    [
      { score: (item) => item.waitScore, prefer: "max" },
      { score: (item) => Evaluate.uselessness(info, item.candidate), prefer: "max" },
    ],
    (item) => candidateKey(item.candidate),
  );
  if (best === null) {
    return null;
  }
  if (level !== "beginner" && best.waitScore < RIICHI_MIN_WAIT_SCORE) {
    return null;
  }
  return best.candidate.action;
};

/** 打牌の選択。レベル別の基準+他家リーチへの押し引きを反映する */
const chooseDiscard = (info: ViewInfo, level: CpuLevel): Action | null => {
  const candidates = Evaluate.discardCandidates(info);
  if (candidates.length === 0) {
    return null;
  }
  if (info.riichiOpponents.length > 0 && !info.selfRiichi) {
    if (level === "standard") {
      // 現物があれば最優先で切る。無ければ自分の効率を通す
      const genbutsu = candidates.filter((candidate) =>
        Safety.isGenbutsu(info, candidate.tile),
      );
      const safe = selectBest(genbutsu, standardCriteria(info), candidateKey);
      if (safe !== null) {
        return safe.action;
      }
    }
    if (level === "advanced" && !shouldPush(info)) {
      const fold = selectBest(candidates, foldCriteria(info), candidateKey);
      if (fold !== null) {
        return fold.action;
      }
    }
  }
  const best = selectBest(candidates, efficiencyCriteria(info, level), candidateKey);
  return best === null ? null : best.action;
};

/** 手番(ツモ後・鳴き後)の行動決定 */
const decideTurn = (info: ViewInfo, level: CpuLevel): Action => {
  const kan = Calls.chooseKan(info, level);
  if (kan !== null) {
    return kan;
  }
  const riichi = chooseRiichi(info, level);
  if (riichi !== null) {
    return riichi;
  }
  const discard = chooseDiscard(info, level);
  if (discard !== null) {
    return discard;
  }
  return info.view.legalActions[0];
};

/** 他家の打牌・加槓への応答(ロンは decide 側で処理済み) */
const decideResponse = (info: ViewInfo, level: CpuLevel): Action => {
  const call = Calls.chooseCall(info, level);
  if (call !== null) {
    return call;
  }
  const pass = info.view.legalActions.find((action) => action.type === "pass");
  return pass ?? info.view.legalActions[0];
};

export const Cpu = {
  /**
   * view.legalActions の中から1つ選んで返す(必ず legalActions の要素を
   * 返す)。同じ view と level には常に同じ行動を返す純粋関数。
   * 卓の公開情報と自分の手牌(view の内容)のみに基づいて判断する。
   * legalActions が空(手番・宣言機会でない)の view は呼び出し誤り
   */
  decide(view: PlayerView, level: CpuLevel): Action {
    const actions = view.legalActions;
    if (actions.length === 0) {
      throw new Error("Cpu.decide: legalActions is empty");
    }
    // 和了できるなら必ず和了する(全レベル共通)
    const win = actions.find(
      (action) => action.type === "tsumo" || action.type === "ron",
    );
    if (win !== undefined) {
      return win;
    }
    if (actions.length === 1) {
      return actions[0];
    }
    const info = ViewInfo.create(view);
    const isResponse = actions.some((action) => action.type === "pass");
    return isResponse ? decideResponse(info, level) : decideTurn(info, level);
  },
} as const;
