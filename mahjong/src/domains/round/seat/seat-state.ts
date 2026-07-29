import { Hand } from "../../hand/index.ts";
import type { Meld } from "../../meld/index.ts";
import { River } from "../../river/index.ts";
import type { Discard } from "../../river/index.ts";
import type { Tile } from "../../tile/index.ts";

/** 1人分の局中の状態。 */
export type SeatState = Readonly<{
  hand: Hand;
  river: River;
  /** リーチ宣言済みか。 */
  riichi: boolean;
  /** ダブルリーチか。 */
  doubleRiichi: boolean;
  /** 一発が継続しているか。 */
  ippatsu: boolean;
  /** 見逃し・リーチ後の不和了による永続フリテン。 */
  permanentFuriten: boolean;
  /** 同巡内フリテン。 */
  temporaryFuriten: boolean;
}>;

export const SeatState = {
  /** 配牌直後の状態。 */
  create(hand: Hand): SeatState {
    return {
      hand,
      river: River.empty(),
      riichi: false,
      doubleRiichi: false,
      ippatsu: false,
      permanentFuriten: false,
      temporaryFuriten: false,
    };
  },

  /** 和了牌の一覧。 */
  waits(seat: SeatState): readonly Tile[] {
    return Hand.waits(seat.hand);
  },

  /** テンパイか。 */
  isTenpai(seat: SeatState): boolean {
    return Hand.isTenpai(seat.hand);
  },

  /** フリテンか(自分の河・同巡内・永続のいずれか)。 */
  isFuriten(seat: SeatState): boolean {
    if (seat.permanentFuriten || seat.temporaryFuriten) {
      return true;
    }
    return River.containsAny(seat.river, SeatState.waits(seat));
  },

  /** 牌をツモった状態。 */
  draw(seat: SeatState, tile: Tile): SeatState {
    return { ...seat, hand: Hand.add(seat.hand, tile) };
  },

  /** 打牌した状態。 */
  discard(seat: SeatState, tile: Tile, discard: Discard): SeatState {
    return {
      ...seat,
      hand: Hand.remove(seat.hand, tile),
      river: River.add(seat.river, discard),
      temporaryFuriten: false,
    };
  },

  /** 副露した状態。 */
  addMeld(seat: SeatState, meld: Meld, usedTiles: readonly Tile[]): SeatState {
    return { ...seat, hand: Hand.addMeld(seat.hand, meld, usedTiles) };
  },

  /** リーチを宣言した状態。 */
  declareRiichi(seat: SeatState, isDouble: boolean): SeatState {
    return { ...seat, riichi: true, doubleRiichi: isDouble, ippatsu: true };
  },

  /** 一発を消した状態。 */
  clearIppatsu(seat: SeatState): SeatState {
    return seat.ippatsu ? { ...seat, ippatsu: false } : seat;
  },

  /** 同巡内フリテンにした状態。 */
  markTemporaryFuriten(seat: SeatState): SeatState {
    return { ...seat, temporaryFuriten: true };
  },

  /** 永続フリテン(リーチ後の見逃し)にした状態。 */
  markPermanentFuriten(seat: SeatState): SeatState {
    return { ...seat, permanentFuriten: true };
  },

  /** 同巡内フリテンを解除した状態(次のツモ時)。 */
  clearTemporaryFuriten(seat: SeatState): SeatState {
    return seat.temporaryFuriten ? { ...seat, temporaryFuriten: false } : seat;
  },
} as const;
