import type { SeatIndex } from "./types.ts";

const SEATS: readonly SeatIndex[] = [0, 1, 2, 3];

const next = (seat: SeatIndex): SeatIndex => (((seat + 1) % 4) as SeatIndex);

const shimocha = (seat: SeatIndex): SeatIndex => next(seat);

/** discarder から反時計回り(次の手番方向)に seat が何人分離れているか(1..3)。 */
const distanceFrom = (discarder: SeatIndex, seat: SeatIndex): number =>
  ((seat - discarder + 4) % 4 === 0 ? 4 : (seat - discarder + 4) % 4);

const others = (seat: SeatIndex): readonly SeatIndex[] => SEATS.filter((s) => s !== seat);

export const Seat = {
  all: SEATS,
  next,
  shimocha,
  distanceFrom,
  others,
} as const;
