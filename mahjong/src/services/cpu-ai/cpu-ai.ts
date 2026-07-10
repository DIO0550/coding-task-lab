import type { CpuLevel, GameAction, GameView, LegalAction } from "../../domains/game/index.ts";
import type { Rng } from "../../types/rng.ts";
import { chooseDiscard } from "./discard-policy.ts";
import { decideNaki } from "./naki-policy.ts";
import { decideRiichiOrDama } from "./riichi-policy.ts";

/** 決定的なタイブレークのみに rng を使う(通常は使わない)フォールバック用の選択。 */
const pick = <T,>(items: readonly T[], rng: Rng): T => {
  const index = Math.min(Math.floor(rng() * items.length), items.length - 1);
  return items[index] as T;
};

/**
 * 通常は到達しないはずの LegalAction をそのまま GameAction に変換するフォールバック。
 * 各レベルの意思決定ロジックが対応し切れない合法手(例: turnフェーズのカン)向けの最終手段。
 */
const convertFallback = (action: LegalAction, rng: Rng): GameAction => {
  switch (action.type) {
    case "tsumo":
      return { type: "tsumo", seat: action.seat };
    case "ron":
      return { type: "ron", seat: action.seat };
    case "pon":
      return { type: "pon", seat: action.seat };
    case "chi": {
      const option = pick(action.options, rng);
      return { type: "chi", seat: action.seat, tiles: option };
    }
    case "kan": {
      const tile = pick(action.tiles, rng);
      return { type: "kan", seat: action.seat, tile };
    }
    case "riichi": {
      const tile = pick(action.tiles, rng);
      return { type: "discard", seat: action.seat, tile, riichi: true };
    }
    case "discard": {
      const tile = pick(action.tiles, rng);
      return { type: "discard", seat: action.seat, tile, riichi: false };
    }
    case "pass":
      return { type: "pass", seat: action.seat };
    default:
      throw new Error("未知のLegalAction");
  }
};

/**
 * CPU の行動決定(レベル別)。
 * - ツモ/ロンが合法手にあれば必ず宣言する(「CPU自動和了: あり」相当。なし設定でも同じ挙動とする)
 * - claims フェーズ(他家の打牌への応答)では、レベル別の鳴き判断(naki-policy)に従い、
 *   鳴かないと判断すればパスする。役牌の大明槓など明確な価値があるカンも選択する。
 * - turnフェーズでリーチが合法手にあれば、レベル別のリーチ判断(riichi-policy)に従う
 *   (入門は常にリーチ、標準/上級は待ち・打点を考慮しダマも選ぶ)
 * - 打牌はレベル別の打牌選択(discard-policy)に従う
 * - 自分の手番で合法な暗槓・加槓があれば和了判断の次に選択する
 */
const decide = (view: GameView, level: CpuLevel, rng: Rng): GameAction => {
  const legal = view.legalActions;

  const tsumo = legal.find((a) => a.type === "tsumo");
  if (tsumo !== undefined) {
    return { type: "tsumo", seat: view.seat };
  }

  const ron = legal.find((a) => a.type === "ron");
  if (ron !== undefined) {
    return { type: "ron", seat: view.seat };
  }

  if (view.phase === "claims") {
    const nakiAction = decideNaki(view, level);
    if (nakiAction !== null) {
      return nakiAction;
    }
    const pass = legal.find((a) => a.type === "pass");
    if (pass !== undefined) {
      return { type: "pass", seat: view.seat };
    }
    const fallback = legal[0];
    if (fallback === undefined) {
      throw new Error("合法手が1つも無い状態でCpuAi.decideが呼ばれた");
    }
    return convertFallback(fallback, rng);
  }

  const kan = legal.find((action): action is Extract<LegalAction, { type: "kan" }> => action.type === "kan");
  if (kan !== undefined) {
    const tile = kan.tiles[0];
    if (tile !== undefined) {
      return { type: "kan", seat: view.seat, tile };
    }
  }

  const riichi = legal.find((a): a is Extract<LegalAction, { type: "riichi" }> => a.type === "riichi");
  if (riichi !== undefined) {
    if (level === "beginner") {
      const tile = riichi.tiles[0];
      if (tile !== undefined) {
        return { type: "discard", seat: view.seat, tile, riichi: true };
      }
    } else {
      const { tile, riichi: shouldRiichi } = decideRiichiOrDama(view, riichi.tiles);
      return { type: "discard", seat: view.seat, tile, riichi: shouldRiichi };
    }
  }

  const discard = legal.find((a): a is Extract<LegalAction, { type: "discard" }> => a.type === "discard");
  if (discard !== undefined && discard.tiles.length > 0) {
    const tile = chooseDiscard(view, level, discard.tiles);
    return { type: "discard", seat: view.seat, tile, riichi: false };
  }

  const fallback = legal[0];
  if (fallback === undefined) {
    throw new Error("合法手が1つも無い状態でCpuAi.decideが呼ばれた");
  }
  return convertFallback(fallback, rng);
};

export const CpuAi = {
  decide,
} as const;
