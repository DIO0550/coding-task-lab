/** 席番号(0=起家の東家から反時計回り) */
export type SeatIndex = 0 | 1 | 2 | 3;

/** 4席分の値を席順に保持するタプル */
export type Seats<T> = readonly [T, T, T, T];

const NEXT_SEAT: Seats<SeatIndex> = [1, 2, 3, 0];

export const SeatIndex = {
  all: [0, 1, 2, 3],

  /** 次の席(下家)を返す */
  next(seat: SeatIndex): SeatIndex {
    return NEXT_SEAT[seat];
  },

  /** 文字列を席番号として解釈する(不正値は null) */
  parse(value: string): SeatIndex | null {
    return SeatIndex.all.find((seat) => String(seat) === value) ?? null;
  },
} as const;

export const Seats = {
  map<T, U>(seats: Seats<T>, mapper: (value: T, seat: SeatIndex) => U): Seats<U> {
    return [mapper(seats[0], 0), mapper(seats[1], 1), mapper(seats[2], 2), mapper(seats[3], 3)];
  },

  update<T>(seats: Seats<T>, seat: SeatIndex, updater: (value: T) => T): Seats<T> {
    return Seats.map(seats, (value, current) => (current === seat ? updater(value) : value));
  },
} as const;
