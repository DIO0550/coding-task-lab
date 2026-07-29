import type { Hand } from "../../../domains/hand/index.ts";
import type { Meld } from "../../../domains/meld/index.ts";
import type { Participant } from "../../../domains/participant/index.ts";
import type { River } from "../../../domains/river/index.ts";
import type { RoundPhase } from "../../../domains/round/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import type { Wind } from "../../../domains/wind/index.ts";
import { GameAction } from "../action/index.ts";
import type { GameActionType } from "../action/index.ts";

/** 応答待ちの打牌情報。 */
export type ClaimView = Readonly<{
  /** 打牌した席。 */
  from: number;
  tile: Tile;
  /** 加槓に対する槍槓待ちか。 */
  chankan: boolean;
}>;

/**
 * 1人の視点から見た卓の状態。
 * 自分の手牌と卓の公開情報だけを含み、他家の手牌や山の中身は含まない。
 * CPUの行動決定も画面表示もこの型だけを見る。
 */
export type PlayerView = Readonly<{
  seat: number;
  hand: Hand;
  /** 自分がツモった牌(打牌前のみ)。 */
  drawn: Tile | null;
  /** 各家の純手牌の枚数(公開情報)。 */
  handSizes: readonly number[];
  rivers: readonly River[];
  melds: readonly (readonly Meld[])[];
  riichi: readonly boolean[];
  scores: readonly number[];
  participants: readonly Participant[];
  seatWinds: readonly Wind[];
  dealer: number;
  roundWind: Wind;
  roundNumber: number;
  honba: number;
  riichiSticks: number;
  doraIndicators: readonly Tile[];
  /** 残りツモ可能枚数。 */
  remaining: number;
  turn: number;
  phase: RoundPhase;
  claim: ClaimView | null;
  /** この席がいま選択できる行動。 */
  actions: readonly GameAction[];
}>;

export const PlayerView = {
  /** 自分の手番か。 */
  isMyTurn(view: PlayerView): boolean {
    return view.turn === view.seat && view.phase === "action";
  },

  /** 指定種別の行動が選べるか。 */
  can(view: PlayerView, type: GameActionType): boolean {
    return GameAction.includes(view.actions, type);
  },

  /** 指定種別の行動一覧。 */
  actionsOf(view: PlayerView, type: GameActionType): readonly GameAction[] {
    return GameAction.filter(view.actions, type);
  },

  /** 捨てられる純手牌の位置。 */
  discardableIndexes(view: PlayerView): readonly number[] {
    return view.actions.flatMap((action) =>
      action.type === "discard" ? [action.index] : [],
    );
  },

  /** リーチ宣言で捨てられる純手牌の位置。 */
  riichiIndexes(view: PlayerView): readonly number[] {
    return view.actions.flatMap((action) =>
      action.type === "riichi" ? [action.index] : [],
    );
  },

  /** 行動を1つでも選べるか。 */
  hasAction(view: PlayerView): boolean {
    return view.actions.length > 0;
  },

  /** 自分の副露。 */
  ownMelds(view: PlayerView): readonly Meld[] {
    return view.melds[view.seat];
  },

  /** 現在のドラ。 */
  dora(view: PlayerView): readonly Tile[] {
    return view.doraIndicators.map((tile) => Tile.doraFromIndicator(tile));
  },

  /** 全員の捨て牌に含まれる牌(安全牌判断などに使う公開情報)。 */
  allDiscards(view: PlayerView): readonly Tile[] {
    return view.rivers.flatMap((river) =>
      river.discards.map((discard) => discard.tile),
    );
  },
} as const;
