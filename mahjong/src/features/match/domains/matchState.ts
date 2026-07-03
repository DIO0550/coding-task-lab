import { Score, type Payment } from "@/domains/score";
import type { MatchSetup } from "./matchSetup";
import { Round, type MatchLength } from "./round";
import { SeatIndex, Seats } from "./seat";
import { WinDeclaration } from "./winDeclaration";

/** 自風(東/南/西/北) */
export type Wind = "east" | "south" | "west" | "north";

const WIND_ORDER = ["east", "south", "west", "north"] as const;

const WIND_LABELS: Readonly<Record<Wind, string>> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

export const Wind = {
  /** 「東」「南」「西」「北」の表示文字 */
  label(wind: Wind): string {
    return WIND_LABELS[wind];
  },
} as const;

/** 対戦中の1プレイヤー(表示名と持ち点) */
export type MatchPlayer = Readonly<{
  name: string;
  score: number;
}>;

/** 対戦状態(局・本場・供託・親・持ち点) */
export type MatchState = Readonly<{
  players: Seats<MatchPlayer>;
  round: Round;
  honba: number;
  kyotaku: number;
  dealerSeat: SeatIndex;
  matchLength: MatchLength;
}>;

/** 支払い内訳を席ごとの減点にマッピングする(riichi_sticks は誰からも引かない) */
const collectLosses = (
  state: MatchState,
  declaration: WinDeclaration,
  payments: readonly Payment[],
): ReadonlyMap<SeatIndex, number> => {
  const losses = new Map<SeatIndex, number>();
  if (declaration.winType === "ron") {
    const discarder = payments.find((payment) => payment.from === "discarder");
    if (declaration.loserSeat !== null && discarder !== undefined) {
      losses.set(declaration.loserSeat, discarder.amount);
    }
    return losses;
  }
  const nonDealerSeats = SeatIndex.all.filter(
    (seat) => seat !== declaration.winnerSeat && seat !== state.dealerSeat,
  );
  let nonDealerIndex = 0;
  for (const payment of payments) {
    if (payment.from === "dealer") {
      losses.set(state.dealerSeat, payment.amount);
    } else if (payment.from === "non_dealer") {
      const seat = nonDealerSeats[nonDealerIndex];
      if (seat !== undefined) {
        losses.set(seat, payment.amount);
        nonDealerIndex += 1;
      }
    }
  }
  return losses;
};

export const MatchState = {
  /** 対戦開始設定から東一局・0本場・供託0本の開始状態を作る */
  start(setup: MatchSetup): MatchState {
    return {
      players: Seats.map(setup.players, (config) => ({
        name: config.name,
        score: setup.rules.startingPoints,
      })),
      round: Round.first(),
      honba: 0,
      kyotaku: 0,
      dealerSeat: 0,
      matchLength: setup.rules.matchLength,
    };
  },

  /** 現在の親を東とした各席の自風 */
  windOf(state: MatchState, seat: SeatIndex): Wind {
    return WIND_ORDER[(seat - state.dealerSeat + 4) % 4];
  },

  isDealer(state: MatchState, seat: SeatIndex): boolean {
    return seat === state.dealerSeat;
  },

  /**
   * 和了結果を反映する。
   * - 和了者へ total(供託・本場込み)を加算し、支払い者から減算する
   * - 供託は0本に戻す
   * - 親和了: 連荘・本場+1 / 子和了: 次局・親移動・本場0
   */
  applyWin(state: MatchState, declaration: WinDeclaration): MatchState {
    if (!WinDeclaration.isValid(declaration)) {
      return state;
    }
    const isDealerWin = MatchState.isDealer(state, declaration.winnerSeat);
    const result = Score.calculate({
      han: declaration.han,
      fu: declaration.fu,
      isDealer: isDealerWin,
      winType: declaration.winType,
      honba: state.honba,
      kyotaku: state.kyotaku,
    });
    const losses = collectLosses(state, declaration, result.payments);
    const players = Seats.map(state.players, (player, seat) => {
      if (seat === declaration.winnerSeat) {
        return { ...player, score: player.score + result.total };
      }
      const loss = losses.get(seat) ?? 0;
      return loss === 0 ? player : { ...player, score: player.score - loss };
    });
    if (isDealerWin) {
      return { ...state, players, kyotaku: 0, honba: state.honba + 1 };
    }
    return {
      ...state,
      players,
      kyotaku: 0,
      honba: 0,
      round: Round.next(state.round, state.matchLength),
      dealerSeat: SeatIndex.next(state.dealerSeat),
    };
  },
} as const;
