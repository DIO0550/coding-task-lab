import { Wind } from "@/src/domains/wind";

/**
 * 席番号。0 が起家(最初の親)で、時計回り(下家方向)に 1, 2, 3 と進む。
 */
export type SeatIndex = 0 | 1 | 2 | 3;

const ALL: readonly SeatIndex[] = [0, 1, 2, 3];

export const Seat = {
  all(): readonly SeatIndex[] {
    return ALL;
  },

  parse(value: unknown): SeatIndex | undefined {
    return ALL.find((seat) => seat === value);
  },

  /** 下家(次の手番) */
  next(seat: SeatIndex): SeatIndex {
    return Seat.offset(seat, 1);
  },

  /** 上家 */
  previous(seat: SeatIndex): SeatIndex {
    return Seat.offset(seat, 3);
  },

  offset(seat: SeatIndex, delta: number): SeatIndex {
    return ALL[(((seat + delta) % 4) + 4) % 4];
  },

  /** 親の席を基準にした自風 */
  windOf(seat: SeatIndex, dealer: SeatIndex): Wind {
    return Wind.fromIndex(seat - dealer);
  },

  /** from から見て to が「下家」かどうか(チーの可否判定に使う) */
  isNextOf(to: SeatIndex, from: SeatIndex): boolean {
    return Seat.next(from) === to;
  },

  /** 打牌者から見た手番順(下家=1, 対面=2, 上家=3)。頭ハネの優先順に使う */
  distanceFrom(from: SeatIndex, to: SeatIndex): number {
    return (((to - from) % 4) + 4) % 4;
  },
} as const;
