import { Tile } from "../tile/index.ts";
import { Scoring } from "../scoring/index.ts";
import type { WinResult } from "../scoring/index.ts";
import { Wall } from "../wall/index.ts";
import type { GameState, PlayerState, Seat } from "./types.ts";
import { windOfSeat } from "./types.ts";

/** 和了の種別ごとの状況役判定に必要な文脈 */
export type WinSituation = Readonly<{
  winType: "tsumo" | "ron";
  /** 槍槓(加槓へのロン)か */
  chankan: boolean;
}>;

/** 和了が成立した場合の計算結果 */
export type ValidWinResult = Extract<WinResult, { valid: true }>;

const DORA_YAKU_NAMES: readonly string[] = ["dora", "ura_dora", "aka_dora"];

/** 全員が面前(副露なし)か。天和・地和・ダブルリーチ資格の判定に使う */
export const noMeldsCalled = (state: GameState): boolean =>
  state.players.every((player) => player.melds.length === 0);

/** 状況役(海底/河底/嶺上/槍槓/天和/地和)を状態から構築する */
const situationalOf = (
  state: GameState,
  winner: PlayerState,
  situation: WinSituation,
): readonly string[] => {
  const items: string[] = [];
  const remaining = Wall.remaining(state.wall);
  if (situation.winType === "tsumo") {
    if (state.lastDrawKind === "rinshan") {
      items.push("rinshan");
    } else if (remaining === 0) {
      items.push("haitei");
    }
    const isFirstDraw =
      winner.discards.length === 0 && noMeldsCalled(state);
    if (isFirstDraw && state.lastDrawKind === "wall") {
      items.push(winner.seat === state.dealer ? "tenhou" : "chihou");
    }
  } else {
    if (situation.chankan) {
      items.push("chankan");
    } else if (remaining === 0) {
      items.push("houtei");
    }
  }
  return items;
};

/**
 * ゲーム状態から Part1 点数計算エンジンの生入力オブジェクトを組み立てる。
 * hand は winTile を除いた面前手牌(13-3m枚)で渡し、winTile 側で補完させる
 */
export const buildWinInput = (
  state: GameState,
  winner: PlayerState,
  winTile: Tile,
  situation: WinSituation,
): Record<string, unknown> => {
  const riichi = winner.riichi;
  const uraDora =
    riichi === "none"
      ? []
      : Wall.uraDoraTiles(
          state.wall,
          state.wall.doraIndicators.length,
        ).map((tile) => Tile.toNotation(tile));
  return {
    hand: winner.hand.map((tile) => Tile.toNotation(tile)),
    melds: winner.melds.map((called) => ({
      type: called.meld.type,
      tiles: called.meld.tiles.map((tile) => Tile.toNotation(tile)),
    })),
    winTile: Tile.toNotation(winTile),
    winType: situation.winType,
    seatWind: windOfSeat(state.dealer, winner.seat),
    roundWind: state.roundWind,
    dora: Wall.doraTiles(state.wall).map((tile) => Tile.toNotation(tile)),
    uraDora,
    riichi,
    ippatsu: winner.ippatsu,
    situational: situationalOf(state, winner, situation),
  };
};

/** ドラ系エントリを除いた通常役の名前一覧 */
const regularYakuNames = (result: WinResult): readonly string[] =>
  result.valid
    ? result.yaku
        .map((entry) => entry.name)
        .filter((name) => !DORA_YAKU_NAMES.includes(name))
    : [];

/**
 * 和了を評価する。役なし・和了形でない場合は null(和了不可)。
 * 喰いタン「なし」設定では、副露(暗槓以外)ありでタンヤオが唯一の役の手を
 * 役なし扱いにする(点数計算エンジン自体は喰いタンありで固定のため)
 */
export const evaluateWin = (
  state: GameState,
  seat: Seat,
  winTile: Tile,
  situation: WinSituation,
): ValidWinResult | null => {
  const winner = state.players[seat];
  const result = Scoring.evaluate(
    buildWinInput(state, winner, winTile, situation),
  );
  if (!result.valid) {
    return null;
  }
  if (!state.rule.kuitan) {
    const isOpen = winner.melds.some((called) => called.meld.type !== "ankan");
    const regular = regularYakuNames(result);
    if (isOpen && regular.length > 0 && regular.every((n) => n === "tanyao")) {
      return null;
    }
  }
  return result;
};
