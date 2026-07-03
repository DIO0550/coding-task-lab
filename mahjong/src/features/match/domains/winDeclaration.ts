import type { WinType } from "@/domains/score";
import { SeatIndex } from "./seat";

/** 和了結果入力の内容 */
export type WinDeclaration = Readonly<{
  winnerSeat: SeatIndex;
  /** 放銃者(ロン時のみ。ツモは null) */
  loserSeat: SeatIndex | null;
  winType: WinType;
  han: number;
  fu: number;
}>;

const HAN_OPTIONS: readonly number[] = Array.from({ length: 13 }, (_, index) => index + 1);

const FU_OPTIONS: readonly number[] = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

export const WinDeclaration = {
  /** 選択可能な翻数(13翻以上は数え役満としてエンジン側で扱われる) */
  hanOptions: HAN_OPTIONS,

  /** 選択可能な符 */
  fuOptions: FU_OPTIONS,

  /** ロンは和了者と異なる放銃者が必須。ツモは放銃者不要 */
  isValid(declaration: WinDeclaration): boolean {
    if (declaration.winType === "tsumo") {
      return true;
    }
    return declaration.loserSeat !== null && declaration.loserSeat !== declaration.winnerSeat;
  },

  /** 放銃者候補が和了者と重なった場合に次の席へ振り直す */
  resolveLoser(winnerSeat: SeatIndex, candidate: SeatIndex): SeatIndex {
    return candidate === winnerSeat ? SeatIndex.next(winnerSeat) : candidate;
  },
} as const;
