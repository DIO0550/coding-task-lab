import type { SeatIndex } from "@/src/domains/game/index.ts";

const WIND_LABELS: readonly ["東", "南", "西", "北"] = ["東", "南", "西", "北"];

/** dealerSeat を東とした場合の seat の自風表示("東"/"南"/"西"/"北")。 */
export const windLabelForSeat = (seat: SeatIndex, dealerSeat: SeatIndex): string => {
  const index = (seat - dealerSeat + 4) % 4;
  return WIND_LABELS[index];
};
