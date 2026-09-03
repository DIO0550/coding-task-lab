import type { GameState } from "@/src/domains/game-state";
import type { PlayerConfig } from "@/src/domains/player-config";
import type { RuleConfig } from "@/src/domains/rule-config";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import type { SeatView, TableView } from "@/src/domains/table-view";
import type { Tile } from "@/src/domains/tile";
import { Wind } from "@/src/domains/wind";
import { GameEngine } from "@/src/services/game-engine";

/**
 * 卓表示に必要な情報。対戦前(設定画面のプレビュー)と対戦中(TableView)の両方から組み立てる。
 */
export type BoardModel = Readonly<{
  roundWind: Wind;
  roundNumber: number;
  honba: number;
  kyotaku: number;
  /** 残り山枚数(対戦前は null) */
  remaining: number | null;
  doraIndicators: readonly Tile[];
  /** 現在の手番(対戦前・判断待ちがなければ null) */
  turnSeat: SeatIndex | null;
  seats: readonly SeatView[];
}>;

export const BoardModel = {
  /** 対戦開始前の初期表示: 東一局 0本場 供託0本、各家は設定した持ち点 */
  preview(players: readonly PlayerConfig[], rules: RuleConfig): BoardModel {
    return {
      roundWind: "ton",
      roundNumber: 1,
      honba: 0,
      kyotaku: 0,
      remaining: null,
      doraIndicators: [],
      turnSeat: null,
      seats: Seat.all().map((seat) => ({
        seat,
        name: players[seat].name,
        kind: players[seat].kind,
        level: players[seat].level,
        wind: Wind.fromIndex(seat),
        isDealer: seat === 0,
        score: rules.startingPoints,
        melds: [],
        river: [],
        riichi: "none",
        handCount: 13,
        hasDrawn: false,
      })),
    };
  },

  fromView(game: GameState, view: TableView): BoardModel {
    return {
      roundWind: view.roundWind,
      roundNumber: view.roundNumber,
      honba: view.honba,
      kyotaku: view.kyotaku,
      remaining: view.remaining,
      doraIndicators: view.doraIndicators,
      turnSeat: GameEngine.nextActor(game),
      seats: view.seats,
    };
  },
} as const;
