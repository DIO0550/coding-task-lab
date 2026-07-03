import { Tile } from "@/src/domains/tile";
import { Hand } from "@/src/domains/hand";
import { Wall } from "@/src/domains/wall";
import type { Rng } from "@/src/libs/random";
import type {
  DiscardEntry,
  GameConfig,
  GameState,
  Phase,
  PlayerState,
  RoundInfo,
  RuleConfig,
} from "../index";

/** テスト用の決定的な乱数フェイク(mulberry32) */
export const seededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

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

export const testConfig = (
  ruleOverrides: Partial<RuleConfig> = {},
): GameConfig => ({
  players: [
    { name: "東", kind: "cpu", cpuLevel: "standard" },
    { name: "南", kind: "cpu", cpuLevel: "standard" },
    { name: "西", kind: "cpu", cpuLevel: "standard" },
    { name: "北", kind: "cpu", cpuLevel: "standard" },
  ],
  rules: testRules(ruleOverrides),
});

export const discardEntry = (
  tile: Tile,
  overrides: Partial<DiscardEntry> = {},
): DiscardEntry => ({
  tile,
  riichi: false,
  claimed: false,
  tsumogiri: false,
  ...overrides,
});

export type PlayerSpec = Partial<
  Omit<PlayerState, "waits" | "furiten" | "hand">
> &
  Readonly<{ hand: readonly Tile[] }>;

/** PlayerState を組み立てる。waits / furiten は手牌から計算する */
export const setupPlayer = (spec: PlayerSpec): PlayerState => {
  const hand = Tile.sort(spec.hand);
  const melds = spec.melds ?? [];
  const discards = spec.discards ?? [];
  const temporaryFuriten = spec.temporaryFuriten ?? false;
  const riichiFuriten = spec.riichiFuriten ?? false;
  const waits = Hand.waits(
    Hand.create(
      hand,
      melds.map((gameMeld) => gameMeld.meld),
    ),
  );
  const discardFuriten = waits.some((wait) =>
    discards.some((entry) => Tile.toIndex(entry.tile) === Tile.toIndex(wait)),
  );
  return {
    hand,
    drawn: spec.drawn ?? null,
    melds,
    discards,
    riichi: spec.riichi ?? "none",
    riichiTileIndex: spec.riichiTileIndex ?? null,
    ippatsu: spec.ippatsu ?? false,
    points: spec.points ?? 25000,
    furiten: discardFuriten || temporaryFuriten || riichiFuriten,
    waits,
    temporaryFuriten,
    riichiFuriten,
  };
};

/** テンパイしていない13枚のゴミ手(鳴き・ロンが発生しない) */
export const junkHand: readonly Tile[] = [
  "1m",
  "4m",
  "7m",
  "1p",
  "4p",
  "7p",
  "1s",
  "4s",
  "7s",
  "ton",
  "nan",
  "sha",
  "pei",
];

type StateSpec = Readonly<{
  players: readonly [PlayerSpec, PlayerSpec, PlayerSpec, PlayerSpec];
  phase: Phase;
  /** ツモ山(先頭からツモる)。省略時は空(残り山0) */
  live?: readonly Tile[];
  /** 王牌14枚。[4] がドラ表示牌、[9] が裏ドラ表示牌 */
  dead?: readonly Tile[];
  dealer?: number;
  round?: Partial<RoundInfo>;
  rules?: Partial<RuleConfig>;
  /** 既定 true(天和・地和・ダブルリーチを無効化)。一巡目の検証時のみ false にする */
  interrupted?: boolean;
  rinshan?: boolean;
  turnCount?: number;
}>;

/** ドラ表示牌 ton(ドラ: nan)・裏表示牌 sha(裏ドラ: pei) の無害な王牌 */
export const inertDeadWall: readonly Tile[] = [
  "1m",
  "1m",
  "1m",
  "1m",
  "ton",
  "ton",
  "ton",
  "ton",
  "ton",
  "sha",
  "sha",
  "sha",
  "sha",
  "sha",
];

/** 任意の局面の GameState を組み立てる */
export const setupState = (spec: StateSpec): GameState => {
  const wall: Wall = {
    live: spec.live ?? [],
    dead: spec.dead ?? inertDeadWall,
    rinshanDrawn: 0,
    doraCount: 1,
  };
  return {
    config: testConfig(spec.rules),
    players: spec.players.map(setupPlayer),
    dealer: spec.dealer ?? 0,
    round: {
      wind: "ton",
      kyoku: 1,
      honba: 0,
      kyotaku: 0,
      ...spec.round,
    },
    wallCount: Wall.liveCount(wall),
    doraIndicators: Wall.doraIndicators(wall),
    turnCount: spec.turnCount ?? 6,
    phase: spec.phase,
    wall,
    interrupted: spec.interrupted ?? true,
    rinshan: spec.rinshan ?? false,
  };
};
