import { Deal, Wall } from "@/src/domains/game/index.ts";
import type { MatchConfig, MatchState, PlayerConfig, RuleSet, SeatIndex } from "@/src/domains/game/index.ts";
import { Tile } from "@/src/domains/tile/index.ts";
import type { Tile as TileType } from "@/src/domains/tile/index.ts";
import type { Scheduler } from "@/src/libs/scheduler.ts";
import type { Rng } from "@/src/types/rng.ts";

/** テスト用の牌リテラル列を Tile[] に変換する。 */
export const t = (...ss: readonly string[]): readonly TileType[] =>
  ss.map((s) => {
    const parsed = Tile.parse(s);
    if (parsed === null) {
      throw new Error(`不正な牌表記: ${s}`);
    }
    return parsed;
  });

export const defaultRules = (overrides: Partial<RuleSet> = {}): RuleSet => ({
  matchType: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  redDora: true,
  cpuAutoWin: true,
  ...overrides,
});

export const testPlayers = (): readonly [PlayerConfig, PlayerConfig, PlayerConfig, PlayerConfig] => [
  { kind: "human", name: "あなた", cpuLevel: null },
  { kind: "cpu", name: "CPU1", cpuLevel: "beginner" },
  { kind: "cpu", name: "CPU2", cpuLevel: "beginner" },
  { kind: "cpu", name: "CPU3", cpuLevel: "beginner" },
];

export const testConfig = (overrides: Partial<RuleSet> = {}): MatchConfig => ({
  players: testPlayers(),
  rules: defaultRules(overrides),
});

export type WallSpec = Readonly<{
  hands?: readonly (readonly TileType[])[];
  draws?: readonly TileType[];
  rinshan?: readonly TileType[];
  doraIndicators?: readonly TileType[];
  uraIndicators?: readonly TileType[];
  redDora?: boolean;
}>;

/**
 * 136枚の完全な牌セットから、指定した牌を指定の位置(配牌・ツモ順・嶺上・ドラ表示・裏ドラ表示)へ
 * 確定で配置し、残りは重複しない余り牌で埋めた牌山を作る。和了・流局が発生する状況をテスト内で
 * 決定的に組み立てるためのビルダー(src/services/game-engine の同種テストヘルパーと同じ考え方)。
 */
export const buildWall = (spec: WallSpec): readonly TileType[] => {
  let pool = [...Wall.orderedDeck(defaultRules({ redDora: spec.redDora ?? true }))];

  const takeExact = (tile: TileType): TileType => {
    const index = pool.findIndex((x) => Tile.strictEquals(x, tile));
    if (index === -1) {
      throw new Error(`テスト用牌山の元になる牌が不足している: ${Tile.format(tile)}`);
    }
    pool = [...pool.slice(0, index), ...pool.slice(index + 1)];
    return tile;
  };

  const takeFiller = (): TileType => {
    const next = pool[pool.length - 1];
    if (next === undefined) {
      throw new Error("牌山の残り枚数が不足している");
    }
    pool = pool.slice(0, -1);
    return next;
  };

  const sections: readonly Readonly<{ explicit: readonly TileType[]; size: number }>[] = [
    { explicit: spec.hands?.[0] ?? [], size: 13 },
    { explicit: spec.hands?.[1] ?? [], size: 13 },
    { explicit: spec.hands?.[2] ?? [], size: 13 },
    { explicit: spec.hands?.[3] ?? [], size: 13 },
    { explicit: spec.draws ?? [], size: 70 },
    { explicit: spec.rinshan ?? [], size: 4 },
    { explicit: spec.doraIndicators ?? [], size: 5 },
    { explicit: spec.uraIndicators ?? [], size: 5 },
  ];

  const explicitPlaced = sections.map((section) => section.explicit.map((tile) => takeExact(tile)));

  const result = sections.map((section, i) => {
    const placed = explicitPlaced[i] as readonly TileType[];
    const filler = Array.from({ length: section.size - placed.length }, () => takeFiller());
    return [...placed, ...filler];
  });

  return result.flat();
};

export type TestMatchSpec = Readonly<{
  config?: MatchConfig;
  hands?: readonly (readonly TileType[])[];
  draws?: readonly TileType[];
  rinshan?: readonly TileType[];
  doraIndicators?: readonly TileType[];
  uraIndicators?: readonly TileType[];
  dealerSeat?: SeatIndex;
  scores?: readonly [number, number, number, number];
  honba?: number;
  kyotaku?: number;
}>;

/** 決定的な牌山順で1局を開始した MatchState を作る(親の第1ツモ完了状態まで)。 */
export const createTestMatch = (spec: TestMatchSpec = {}): MatchState => {
  const config = spec.config ?? testConfig();
  const wall = buildWall({
    hands: spec.hands,
    draws: spec.draws,
    rinshan: spec.rinshan,
    doraIndicators: spec.doraIndicators,
    uraIndicators: spec.uraIndicators,
    redDora: config.rules.redDora,
  });
  const scores =
    spec.scores ??
    ([config.rules.startingPoints, config.rules.startingPoints, config.rules.startingPoints, config.rules.startingPoints] as const);

  return Deal.deal({
    config,
    wall,
    roundWind: "ton",
    kyokuNumber: 1,
    honba: spec.honba ?? 0,
    kyotaku: spec.kyotaku ?? 0,
    dealerSeat: spec.dealerSeat ?? 0,
    scores,
    rngSeed: 0,
  });
};

/** 固定 seed の決定的 Rng(mulberry32)。Math.random は使わない。 */
export const makeRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export type FakeScheduler = Scheduler & Readonly<{ flush: () => void; pendingCount: () => number }>;

/**
 * setTimeout を使わず、手動で flush するまで実行しないフェイクスケジューラ。
 * 「プロセス外・制御不能な境界(時刻・タイマー)」の代替としてテストから注入する。
 */
export const createFakeScheduler = (): FakeScheduler => {
  let nextId = 0;
  let pending: Readonly<{ id: number; callback: () => void }>[] = [];

  return {
    schedule: (callback) => {
      const id = nextId;
      nextId += 1;
      pending = [...pending, { id, callback }];
      return () => {
        pending = pending.filter((p) => p.id !== id);
      };
    },
    flush: () => {
      const toRun = pending;
      pending = [];
      toRun.forEach((p) => p.callback());
    },
    pendingCount: () => pending.length,
  };
};
