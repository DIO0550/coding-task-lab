import { Tile } from "@/src/domains/tile";
import type {
  DiscardEntry,
  GameMeld,
  PlayerView,
  PublicPlayer,
  RiichiDeclaration,
  RuleConfig,
  TurnActions,
} from "@/src/domains/game";

export const testRules = (overrides: Partial<RuleConfig> = {}): RuleConfig => ({
  gameType: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: false,
  cpuAutoWin: true,
  ...overrides,
});

export const discardEntry = (tile: Tile): DiscardEntry => ({
  tile,
  riichi: false,
  claimed: false,
  tsumogiri: false,
});

type PublicSpec = Partial<
  Pick<PublicPlayer, "melds" | "discards" | "riichi" | "handCount">
>;

const publicPlayer = (seat: number, spec: PublicSpec = {}): PublicPlayer => ({
  name: `P${seat}`,
  kind: "cpu",
  seatWind: Tile.windForSeatOffset(seat),
  isDealer: seat === 0,
  handCount: spec.handCount ?? 13,
  hasDrawn: false,
  melds: spec.melds ?? [],
  discards: spec.discards ?? [],
  riichi: spec.riichi ?? "none",
  riichiTileIndex: null,
  points: 25000,
});

type ViewSpec = Readonly<{
  seat?: number;
  ownHand: readonly Tile[];
  ownDrawn?: Tile | null;
  ownMelds?: readonly GameMeld[];
  ownRiichi?: RiichiDeclaration;
  others?: Readonly<Record<number, PublicSpec>>;
  doraIndicators?: readonly Tile[];
  rules?: Partial<RuleConfig>;
}>;

/** CPU の意思決定に渡す PlayerView を組み立てる */
export const setupView = (spec: ViewSpec): PlayerView => {
  const seat = spec.seat ?? 1;
  const players = [0, 1, 2, 3].map((index) => {
    if (index === seat) {
      return publicPlayer(index, {
        melds: spec.ownMelds ?? [],
        riichi: spec.ownRiichi ?? "none",
        handCount: spec.ownHand.length,
      });
    }
    return publicPlayer(index, spec.others?.[index] ?? {});
  });
  return {
    seat,
    seatWind: Tile.windForSeatOffset(seat),
    dealer: 0,
    rules: testRules(spec.rules),
    round: { wind: "ton", kyoku: 1, honba: 0, kyotaku: 0 },
    wallCount: 40,
    doraIndicators: spec.doraIndicators ?? ["ton"],
    turnCount: 10,
    ownHand: Tile.sort(spec.ownHand),
    ownDrawn: spec.ownDrawn ?? null,
    ownFuriten: false,
    players,
    phase: { type: "turn", actor: seat },
  };
};

/** 打牌のみ可能な TurnActions を組み立てる */
export const turnActions = (
  discards: readonly Tile[],
  overrides: Partial<TurnActions> = {},
): TurnActions => ({
  canTsumo: false,
  canRiichi: false,
  riichiDiscards: [],
  ankanTiles: [],
  kakanTiles: [],
  discards: Tile.sort(discards),
  ...overrides,
});
