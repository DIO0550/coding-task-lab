import { Deal, Wall } from "../../../domains/game/index.ts";
import type { MatchConfig, MatchState, PlayerConfig, RuleSet, SeatIndex } from "../../../domains/game/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import type { Tile as TileType } from "../../../domains/tile/index.ts";

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

export const defaultPlayers = (): readonly [PlayerConfig, PlayerConfig, PlayerConfig, PlayerConfig] => [
  { kind: "human", name: "P0", cpuLevel: null },
  { kind: "cpu", name: "P1", cpuLevel: "beginner" },
  { kind: "cpu", name: "P2", cpuLevel: "beginner" },
  { kind: "cpu", name: "P3", cpuLevel: "beginner" },
];

export const defaultConfig = (overrides: Partial<RuleSet> = {}): MatchConfig => ({
  players: defaultPlayers(),
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
 * 確定で配置し、残りは(重複しない)余り牌で埋めた牌山を作る。テストから配牌・ツモ順を自由に組める
 * ようにするための決定的な牌山ビルダー。
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
    // 末尾から取る(先頭に近い牌ほど dora 表示等の明示指定に使われやすいため、fillerは末尾優先で消費する)。
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

  // 先に全セクションの明示指定牌を pool から取り除いてから filler を割り当てる。
  // (先に filler を大量消費するセクションを埋めてしまうと、後続セクションの明示指定牌が
  //  枯渇しうるため、explicit の確保を filler 割り当てより必ず先に行う。)
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
  roundWind?: "ton" | "nan";
  kyokuNumber?: 1 | 2 | 3 | 4;
  honba?: number;
  kyotaku?: number;
  dealerSeat?: SeatIndex;
  scores?: readonly [number, number, number, number];
}>;

/**
 * 決定的な牌山順で1局を開始した MatchState を作る(親の第1ツモ完了状態まで)。
 * dealerSeat を変えることで「任意の席が最初にツモる」状況を直接作れる。
 */
export const createTestMatch = (spec: TestMatchSpec = {}): MatchState => {
  const config = spec.config ?? defaultConfig();
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
    roundWind: spec.roundWind ?? "ton",
    kyokuNumber: spec.kyokuNumber ?? 1,
    honba: spec.honba ?? 0,
    kyotaku: spec.kyotaku ?? 0,
    dealerSeat: spec.dealerSeat ?? 0,
    scores,
    rngSeed: 0,
  });
};
