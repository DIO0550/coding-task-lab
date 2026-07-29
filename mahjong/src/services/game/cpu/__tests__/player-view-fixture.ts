import { Hand } from "../../../../domains/hand/index.ts";
import type { Meld } from "../../../../domains/meld/index.ts";
import { Participant } from "../../../../domains/participant/index.ts";
import { River } from "../../../../domains/river/index.ts";
import type { Discard } from "../../../../domains/river/index.ts";
import type { RoundPhase } from "../../../../domains/round/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import { Wind } from "../../../../domains/wind/index.ts";
import { GameAction } from "../../action/index.ts";
import type { ClaimView, PlayerView } from "../../view/index.ts";

const SEATS: readonly number[] = [0, 1, 2, 3];
const STARTING_POINTS = 25000;
const DEFAULT_REMAINING = 50;

/** `"1m 2m 3m"` 形式の牌表記を牌の配列にする。 */
export const tilesOf = (codes: string): readonly Tile[] => {
  const trimmed = codes.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return Tile.fromCodes(trimmed.split(/\s+/)) ?? [];
};

/** 1枚の牌。 */
export const tileOf = (code: string): Tile => tilesOf(code)[0];

/** 純手牌(と副露)からなる手牌。 */
export const handOf = (codes: string, melds: readonly Meld[] = []): Hand =>
  Hand.create(tilesOf(codes), melds);

const discardOf = (tile: Tile, called: boolean): Discard => ({
  tile,
  riichi: false,
  called,
  tsumogiri: false,
});

/** 捨て牌の河。 */
export const riverOf = (codes: string): River => ({
  discards: tilesOf(codes).map((tile) => discardOf(tile, false)),
});

/** すべて鳴かれた捨て牌の河。 */
export const calledRiverOf = (codes: string): River => ({
  discards: tilesOf(codes).map((tile) => discardOf(tile, true)),
});

/** 席ごとの河。指定しない席は空の河になる。 */
export const riversOf = (
  rivers: Readonly<Record<number, River>>,
): readonly River[] => SEATS.map((seat) => rivers[seat] ?? River.empty());

/** 席ごとの副露。指定しない席は副露なしになる。 */
export const meldsOf = (
  melds: Readonly<Record<number, readonly Meld[]>>,
): readonly (readonly Meld[])[] => SEATS.map((seat) => melds[seat] ?? []);

/** 席ごとのリーチ状態。 */
export const riichiOf = (seats: readonly number[]): readonly boolean[] =>
  SEATS.map((seat) => seats.includes(seat));

/** 応答待ちの打牌。 */
export const claimOf = (code: string, from: number): ClaimView => ({
  from,
  tile: tileOf(code),
  chankan: false,
});

/** 純手牌のすべてを捨てられる打牌の行動一覧。 */
export const discardActions = (hand: Hand): readonly GameAction[] =>
  hand.concealed.map((_, index) => GameAction.discard(index));

/** 指定した牌表記の位置の打牌行動。 */
export const discardActionsOf = (
  hand: Hand,
  codes: string,
): readonly GameAction[] =>
  tilesOf(codes).flatMap((tile) => {
    const index = hand.concealed.findIndex((member) =>
      Tile.isSameKind(member, tile),
    );
    return index < 0 ? [] : [GameAction.discard(index)];
  });

/** 指定した牌表記の位置のリーチ宣言行動。 */
export const riichiActionsOf = (
  hand: Hand,
  codes: string,
): readonly GameAction[] =>
  discardActionsOf(hand, codes).flatMap((action) =>
    action.type === "discard" ? [GameAction.riichi(action.index)] : [],
  );

export type ViewOptions = Readonly<{
  seat?: number;
  hand?: Hand;
  drawn?: Tile | null;
  rivers?: readonly River[];
  melds?: readonly (readonly Meld[])[];
  riichi?: readonly boolean[];
  doraIndicators?: readonly Tile[];
  actions?: readonly GameAction[];
  claim?: ClaimView | null;
  phase?: RoundPhase;
  turn?: number;
  dealer?: number;
  remaining?: number;
}>;

const DEFAULT_HAND_CODES = "1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton nan sha";

/** テスト用の卓の状態。省略した項目は東1局・親0番・ドラなしの初期値になる。 */
export const viewOf = (options: ViewOptions = {}): PlayerView => {
  const seat = options.seat ?? 0;
  const dealer = options.dealer ?? 0;
  const hand = options.hand ?? handOf(DEFAULT_HAND_CODES);
  return {
    seat,
    hand,
    drawn: options.drawn ?? null,
    handSizes: SEATS.map((current) =>
      current === seat ? hand.concealed.length : 13,
    ),
    rivers: options.rivers ?? riversOf({}),
    melds: options.melds ?? meldsOf({}),
    riichi: options.riichi ?? riichiOf([]),
    scores: SEATS.map(() => STARTING_POINTS),
    participants: Participant.defaultSeats(),
    seatWinds: SEATS.map((current) => Wind.ofSeat(current, dealer)),
    dealer,
    roundWind: "ton",
    roundNumber: 1,
    honba: 0,
    riichiSticks: 0,
    doraIndicators: options.doraIndicators ?? [],
    remaining: options.remaining ?? DEFAULT_REMAINING,
    turn: options.turn ?? seat,
    phase: options.phase ?? "action",
    claim: options.claim ?? null,
    actions: options.actions ?? discardActions(hand),
  };
};

/**
 * 選ばれた行動を読みやすい文字列にする。
 * 打牌・リーチは切る牌の表記、それ以外は行動の種別を返す。
 */
export const choiceOf = (
  view: PlayerView,
  action: GameAction | null,
): string => {
  if (action === null) {
    return "none";
  }
  if (action.type === "discard" || action.type === "riichi") {
    return `${action.type}:${Tile.toCode(view.hand.concealed[action.index])}`;
  }
  return action.type;
};
