import { Seat } from "@/src/domains/game/index.ts";
import type { SeatIndex } from "@/src/domains/game/index.ts";

const WIND_LABELS = { ton: "東", nan: "南", sha: "西", pei: "北" } as const;

/** dealerSeat を東とした場合の seat の自風表示("東"/"南"/"西"/"北")。 */
export const windLabelForSeat = (seat: SeatIndex, dealerSeat: SeatIndex): string => {
  return WIND_LABELS[Seat.windFromDealer(dealerSeat, seat)];
};
