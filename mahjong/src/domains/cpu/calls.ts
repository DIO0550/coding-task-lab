import { Tile } from "../tile/index.ts";
import { Hand } from "../hand/index.ts";
import type { Action, CpuLevel } from "../game/index.ts";
import { ViewInfo, countKind } from "./view-info.ts";
import { selectBest } from "./evaluate.ts";
import type { Criterion } from "./evaluate.ts";

type KanAction = Extract<Action, { type: "kan" }>;
type CallAction = Extract<Action, { type: "chi" | "pon" }>;

/** 鳴き・カン候補の評価結果 */
type CallCandidate = Readonly<{
  action: CallAction;
  /** 鳴いた後に手に残る牌 */
  newHand: readonly Tile[];
  /** 鳴いた後(打牌前)のシャンテン数 */
  after: number;
}>;

const YAKUHAI_TRIPLET_SIZE = 3;
/** タンヤオ狙いと見なせる、鳴き後の手に残ってよい幺九牌の枚数 */
const TANYAO_MAX_YAOCHU = 1;
/** 混一色狙いと見なせる、染めスート・字牌以外の牌の枚数 */
const HONITSU_MAX_OFF_SUIT = 1;

const NUMBER_SUITS = ["m", "p", "s"] as const;

const kanKey = (action: KanAction): string =>
  `${action.kind}:${Tile.toNotation(action.tile)}`;

const callKey = (action: CallAction): string =>
  `${action.type}:${action.tiles
    .map((tile) => Tile.toNotation(tile))
    .toSorted()
    .join(",")}`;

/** 指定牌群を順に取り除く(表記一致優先、なければ種類一致)。欠ければ null */
const removeMany = (
  tiles: readonly Tile[],
  targets: readonly Tile[],
): readonly Tile[] | null =>
  targets.reduce<readonly Tile[] | null>((rest, target) => {
    if (rest === null) {
      return null;
    }
    const exact = rest.findIndex((tile) => Tile.equalsExact(tile, target));
    const index =
      exact >= 0 ? exact : rest.findIndex((tile) => Tile.equals(tile, target));
    if (index < 0) {
      return null;
    }
    return [...rest.slice(0, index), ...rest.slice(index + 1)];
  }, tiles);

/**
 * 鳴いた後も役が見込めるか(簡易判定)。
 * 確定役牌刻子 / タンヤオ(喰いタンあり前提) / 混一色 のいずれかが
 * 成立し得る形なら true
 */
const hasYakuPotential = (
  info: ViewInfo,
  action: CallAction,
  newHand: readonly Tile[],
  calledTile: Tile,
): boolean => {
  const meldTiles = [
    ...info.melds.flatMap((meld) => meld.tiles),
    ...action.tiles,
    calledTile,
  ];
  const combined = [...newHand, ...meldTiles];
  const hasYakuhaiTriplet = Tile.all().some(
    (kind) =>
      ViewInfo.isYakuhai(info, kind) &&
      countKind(combined, kind) >= YAKUHAI_TRIPLET_SIZE,
  );
  if (hasYakuhaiTriplet) {
    return true;
  }
  const tanyaoViable =
    meldTiles.every((tile) => Tile.isSimple(tile)) &&
    newHand.filter((tile) => Tile.isYaochu(tile)).length <= TANYAO_MAX_YAOCHU;
  if (tanyaoViable) {
    return true;
  }
  const offSuitCounts = NUMBER_SUITS.map(
    (suit) =>
      combined.filter((tile) => tile.suit !== "z" && tile.suit !== suit)
        .length,
  );
  return Math.min(...offSuitCounts) <= HONITSU_MAX_OFF_SUIT;
};

/** 赤5を鳴き面子に含めてドラを確定させる枚数(多い候補を優先) */
const redCount = (action: CallAction): number =>
  action.tiles.filter((tile) => Tile.isRed(tile)).length;

export const Calls = {
  /**
   * 暗槓・加槓の判断。シャンテンを悪化させないカンのみ宣言する。
   * リーチ中の自分は待ちが変わらない暗槓(legalActions が保証)を常に宣言。
   * 標準・上級は他家リーチ中の新ドラ追加リスクを避けてカンしない
   */
  chooseKan(info: ViewInfo, level: CpuLevel): Action | null {
    const kans = info.view.legalActions.filter(
      (action): action is KanAction =>
        action.type === "kan" && action.kind !== "minkan",
    );
    if (kans.length === 0) {
      return null;
    }
    if (info.selfRiichi) {
      return selectBest(kans, [], kanKey);
    }
    if (level !== "beginner" && info.riichiOpponents.length > 0) {
      return null;
    }
    const before = Hand.shanten(info.concealed, info.meldCount);
    const qualified = kans.filter((kan) => {
      if (kan.kind === "ankan") {
        const rest = info.concealed.filter(
          (tile) => !Tile.equals(tile, kan.tile),
        );
        return Hand.shanten(rest, info.meldCount + 1) <= before;
      }
      const rest = removeMany(info.concealed, [kan.tile]);
      return rest !== null && Hand.shanten(rest, info.meldCount) <= before;
    });
    return selectBest(qualified, [], kanKey);
  },

  /**
   * 他家の打牌への鳴き(ポン・チー)の判断。鳴かないなら null(=パス)。
   * 明カンは新ドラ追加のリスクを避けて全レベルで宣言しない。
   * 入門: シャンテンが進む役牌ポンのみ。チーはしない。
   * 標準・上級: シャンテンが進み、かつ役(役牌・タンヤオ・混一色)が
   * 見込める鳴きのみ。上級は他家リーチ中は鳴かない(守備優先)
   */
  chooseCall(info: ViewInfo, level: CpuLevel): Action | null {
    const calls = info.view.legalActions.filter(
      (action): action is CallAction =>
        action.type === "pon" || action.type === "chi",
    );
    const lastDiscard = info.view.lastDiscard;
    if (calls.length === 0 || lastDiscard === null) {
      return null;
    }
    if (level === "advanced" && info.riichiOpponents.length > 0) {
      return null;
    }
    const calledTile = lastDiscard.tile;
    const before = Hand.shanten(info.concealed, info.meldCount);
    const advancing = calls.flatMap((action): readonly CallCandidate[] => {
      const newHand = removeMany(info.concealed, action.tiles);
      if (newHand === null) {
        return [];
      }
      const after = Hand.shanten(newHand, info.meldCount + 1);
      return after < before ? [{ action, newHand, after }] : [];
    });
    const qualified = advancing.filter((candidate) => {
      if (level === "beginner") {
        return (
          candidate.action.type === "pon" &&
          ViewInfo.isYakuhai(info, calledTile)
        );
      }
      return hasYakuPotential(info, candidate.action, candidate.newHand, calledTile);
    });
    const criteria: readonly Criterion<CallCandidate>[] = [
      { score: (candidate) => candidate.after, prefer: "min" },
      { score: (candidate) => redCount(candidate.action), prefer: "max" },
      // 同条件ならポン(刻子)をチーより優先する
      { score: (candidate) => (candidate.action.type === "pon" ? 0 : 1), prefer: "min" },
    ];
    const best = selectBest(qualified, criteria, (candidate) =>
      callKey(candidate.action),
    );
    return best === null ? null : best.action;
  },
} as const;
