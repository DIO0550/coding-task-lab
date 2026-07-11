import { Tile } from "../tile/index.ts";
import { Hand } from "../hand/index.ts";
import type { WinningForm } from "../hand/index.ts";
import { ScoreRequest, WinContext } from "../win-context/index.ts";
import type {
  Agari,
  ScoreValue,
  WinResult,
  YakuResult,
} from "../win-context/index.ts";
import { Yaku } from "../yaku/index.ts";
import { Fu } from "../fu/index.ts";
import { Score } from "../score/index.ts";

/** ダブル役満までにクランプするための役満1つ分の翻 */
const YAKUMAN_HAN = 13;
const MAX_YAKUMAN_MULTIPLES = 2;

/** 高点法で採用する1つの解釈(和了形 × 和了位置)の評価結果 */
type Evaluation = Readonly<{
  yaku: readonly YakuResult[];
  han: number;
  fu: number;
  score: ScoreValue;
  isYakuman: boolean;
}>;

/** 手牌(面前+副露)の全牌を平らに並べる。ドラ・赤の枚数計上に使う */
const allTiles = (request: ScoreRequest): readonly Tile[] => [
  ...request.concealed,
  ...request.melds.flatMap((meld) => meld.tiles),
];

/** targets の各牌が tiles 中に出現する総数(赤は無視して種類一致で数える) */
const countMatches = (
  tiles: readonly Tile[],
  targets: readonly Tile[],
): number =>
  targets.reduce(
    (sum, target) =>
      sum + tiles.filter((tile) => Tile.equals(tile, target)).length,
    0,
  );

/**
 * ドラ・裏ドラ・赤ドラを yaku エントリとして数える(han>0 のもののみ)。
 * 裏ドラはリーチ成立時(riichi≠none)のみ有効。ドラは「役」ではないため
 * この結果だけでは和了できない(呼び出し側で通常役の有無を先に判定する)。
 */
const doraEntries = (request: ScoreRequest): readonly YakuResult[] => {
  const tiles = allTiles(request);
  const entries: YakuResult[] = [];
  const dora = countMatches(tiles, request.dora);
  if (dora > 0) {
    entries.push({ name: "dora", han: dora });
  }
  if (request.riichi !== "none") {
    const ura = countMatches(tiles, request.uraDora);
    if (ura > 0) {
      entries.push({ name: "ura_dora", han: ura });
    }
  }
  const aka = tiles.filter((tile) => Tile.isRed(tile)).length;
  if (aka > 0) {
    entries.push({ name: "aka_dora", han: aka });
  }
  return entries;
};

/** 1つの解釈を評価する。役(ドラ除く)も役満も無ければ null(役なし候補) */
const evaluate = (
  request: ScoreRequest,
  form: WinningForm,
  agari: Agari,
): Evaluation | null => {
  const context = WinContext.create(request, form, agari);

  const yakuman = Yaku.detectYakuman(context);
  if (yakuman.length > 0) {
    const yakumanHan = yakuman.reduce((sum, entry) => sum + entry.han, 0);
    const yakumanMultiples = Math.min(
      MAX_YAKUMAN_MULTIPLES,
      Math.floor(yakumanHan / YAKUMAN_HAN),
    );
    const fu = Fu.calculate(context, []);
    const score = Score.compute({
      han: yakumanHan,
      fu,
      isDealer: context.isDealer,
      isTsumo: context.isTsumo,
      honba: 0,
      riichiSticks: 0,
      yakumanMultiples,
    });
    return { yaku: yakuman, han: yakumanHan, fu, score, isYakuman: true };
  }

  const yaku = Yaku.detect(context);
  if (yaku.length === 0) {
    return null;
  }
  const withDora = [...yaku, ...doraEntries(request)];
  const han = withDora.reduce((sum, entry) => sum + entry.han, 0);
  const fu = Fu.calculate(context, yaku);
  const score = Score.compute({
    han,
    fu,
    isDealer: context.isDealer,
    isTsumo: context.isTsumo,
    honba: 0,
    riichiSticks: 0,
  });
  return { yaku: withDora, han, fu, score, isYakuman: false };
};

/**
 * 高点法: 役満>通常役、同カテゴリでは total→han→fu の大きい方を優先する。
 * candidate が best より高得点なら true。
 */
const isHigher = (candidate: Evaluation, best: Evaluation): boolean => {
  if (candidate.isYakuman !== best.isYakuman) {
    return candidate.isYakuman;
  }
  if (candidate.score.total !== best.score.total) {
    return candidate.score.total > best.score.total;
  }
  if (candidate.han !== best.han) {
    return candidate.han > best.han;
  }
  return candidate.fu > best.fu;
};

const evaluateRequest = (request: ScoreRequest): WinResult => {
  const forms = Hand.decompose(request.concealed, request.melds);
  if (forms.length === 0) {
    return { valid: false, reason: "not_winning_hand" };
  }

  const evaluations: Evaluation[] = [];
  for (const form of forms) {
    for (const agari of WinContext.agariPositions(form, request.winTile)) {
      const evaluation = evaluate(request, form, agari);
      if (evaluation !== null) {
        evaluations.push(evaluation);
      }
    }
  }
  if (evaluations.length === 0) {
    return { valid: false, reason: "no_yaku" };
  }

  const best = evaluations.reduce((current, candidate) =>
    isHigher(candidate, current) ? candidate : current,
  );
  return {
    valid: true,
    yaku: best.yaku,
    han: best.han,
    fu: best.fu,
    score: best.score,
  };
};

export const Scoring = {
  /** JSON.parse 済みの値を検証・評価して WinResult を返す */
  evaluate(raw: unknown): WinResult {
    const request = ScoreRequest.parse(raw);
    if (request === null) {
      return { valid: false, reason: "invalid_input" };
    }
    return evaluateRequest(request);
  },

  /** 生の JSON 文字列を評価する。JSON として不正なら invalid_input */
  evaluateJson(json: string): WinResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { valid: false, reason: "invalid_input" };
    }
    return this.evaluate(parsed);
  },
} as const;
