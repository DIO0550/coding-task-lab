import { Tile } from "../tile/index.ts";
import { Hand } from "../hand/index.ts";
import type { HandSet, StandardWin, WinningHand } from "../hand/index.ts";
import { WinContext } from "../win-context/index.ts";

export type YakuName =
  | "riichi"
  | "double_riichi"
  | "ippatsu"
  | "menzen_tsumo"
  | "pinfu"
  | "tanyao"
  | "iipeiko"
  | "seat_wind"
  | "round_wind"
  | "haku"
  | "hatsu"
  | "chun"
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "chiitoitsu"
  | "toitoi"
  | "sanankou"
  | "sankantsu"
  | "sanshoku_doujun"
  | "sanshoku_doukou"
  | "ittsu"
  | "chanta"
  | "junchan"
  | "shousangen"
  | "honroutou"
  | "honitsu"
  | "chinitsu"
  | "ryanpeikou"
  | "dora"
  | "ura_dora"
  | "aka_dora"
  | YakumanName;

export type YakumanName =
  | "tenhou"
  | "chihou"
  | "kokushi_musou"
  | "kokushi_musou_juusanmen"
  | "suuankou"
  | "suuankou_tanki"
  | "daisangen"
  | "shousuushii"
  | "daisuushii"
  | "tsuuiisou"
  | "chinroutou"
  | "ryuuiisou"
  | "chuuren_poutou"
  | "junsei_chuuren_poutou"
  | "suukantsu";

export type YakuHit = Readonly<{ name: YakuName; han: number }>;

/**
 * 役判定の結果。役満成立時は yakumanUnits > 0 で、hits は役満のみを含む
 * (通常役・ドラは複合しない)。倍率の合計はダブル役満(2)を上限とする。
 */
export type YakuDetection = Readonly<{
  hits: ReadonlyArray<YakuHit>;
  yakumanUnits: number;
}>;

const DRAGON_INDEXES: ReadonlyArray<number> = [31, 32, 33];
const DRAGON_NAMES: ReadonlyArray<YakuName> = ["haku", "hatsu", "chun"];
const CHUUREN_BASE: ReadonlyArray<number> = [3, 1, 1, 1, 1, 1, 1, 1, 3];

const tripletLikeSets = (win: StandardWin): ReadonlyArray<HandSet> =>
  win.sets.filter((set) => set.kind !== "run");

const runSets = (win: StandardWin): ReadonlyArray<HandSet> =>
  win.sets.filter((set) => set.kind === "run");

const hasTripletOf = (win: StandardWin, tile: number): boolean =>
  tripletLikeSets(win).some((set) => set.tile === tile);

const countEffectiveConcealedTriplets = (
  win: StandardWin,
  winByRon: boolean,
): number =>
  win.sets.filter((set) => Hand.isEffectiveConcealedTriplet(set, winByRon))
    .length;

const isYakuhaiPair = (pairTile: number, context: WinContext): boolean =>
  Tile.isDragon(pairTile) ||
  pairTile === Tile.windIndex(context.seatWind) ||
  pairTile === Tile.windIndex(context.roundWind);

/** 面子・雀頭がすべて么九牌を含み、順子を1つ以上含むか(チャンタ・純チャンの骨格) */
const isTerminalInEverySet = (win: StandardWin): boolean => {
  if (!Tile.isYaochuu(win.pairTile)) {
    return false;
  }
  if (runSets(win).length === 0) {
    return false;
  }
  return win.sets.every((set) => {
    if (set.kind === "run") {
      return set.tile % 9 === 0 || set.tile % 9 === 6;
    }
    return Tile.isYaochuu(set.tile);
  });
};

const detectChuurenUnits = (
  win: StandardWin,
  context: WinContext,
): number => {
  const usesCall = win.sets.some((set) => !set.concealed || set.kind === "kan");
  if (usesCall) {
    return 0;
  }
  const tiles = Hand.tileIndexes(win);
  const suitBase = Math.floor(tiles[0] / 9) * 9;
  if (suitBase >= 27 || tiles.some((tile) => Math.floor(tile / 9) * 9 !== suitBase)) {
    return 0;
  }
  const rankCounts = new Array<number>(9).fill(0);
  for (const tile of tiles) {
    rankCounts[tile - suitBase] += 1;
  }
  const matchesBase = rankCounts.every(
    (count, rank) => count >= CHUUREN_BASE[rank],
  );
  if (!matchesBase) {
    return 0;
  }
  const winIndex = Tile.index(context.winTile);
  const extraRank = rankCounts.findIndex(
    (count, rank) => count === CHUUREN_BASE[rank] + 1,
  );
  return suitBase + extraRank === winIndex ? 2 : 1;
};

const detectStandardYakuman = (
  win: StandardWin,
  context: WinContext,
): ReadonlyArray<{ name: YakumanName; units: number }> => {
  const results: Array<{ name: YakumanName; units: number }> = [];
  const winByRon = context.winType === "ron";
  const tiles = Hand.tileIndexes(win);
  const triplets = tripletLikeSets(win);

  if (
    triplets.length === 4 &&
    countEffectiveConcealedTriplets(win, winByRon) === 4
  ) {
    results.push(
      win.wait === "tanki"
        ? { name: "suuankou_tanki", units: 2 }
        : { name: "suuankou", units: 1 },
    );
  }
  if (DRAGON_INDEXES.every((tile) => hasTripletOf(win, tile))) {
    results.push({ name: "daisangen", units: 1 });
  }
  const windTriplets = triplets.filter((set) => Tile.isWindTile(set.tile));
  if (windTriplets.length === 4) {
    results.push({ name: "daisuushii", units: 2 });
  } else if (windTriplets.length === 3 && Tile.isWindTile(win.pairTile)) {
    results.push({ name: "shousuushii", units: 1 });
  }
  if (tiles.every(Tile.isHonor)) {
    results.push({ name: "tsuuiisou", units: 1 });
  }
  if (tiles.every(Tile.isTerminal)) {
    results.push({ name: "chinroutou", units: 1 });
  }
  if (tiles.every(Tile.isGreen)) {
    results.push({ name: "ryuuiisou", units: 1 });
  }
  const chuurenUnits = detectChuurenUnits(win, context);
  if (chuurenUnits === 2) {
    results.push({ name: "junsei_chuuren_poutou", units: 2 });
  } else if (chuurenUnits === 1) {
    results.push({ name: "chuuren_poutou", units: 1 });
  }
  if (win.sets.filter((set) => set.kind === "kan").length === 4) {
    results.push({ name: "suukantsu", units: 1 });
  }
  return results;
};

const detectYakuman = (
  win: WinningHand,
  context: WinContext,
): YakuDetection | null => {
  const results: Array<{ name: YakumanName; units: number }> = [];
  if (WinContext.hasSituational(context, "tenhou")) {
    results.push({ name: "tenhou", units: 1 });
  }
  if (WinContext.hasSituational(context, "chihou")) {
    results.push({ name: "chihou", units: 1 });
  }
  if (win.form === "kokushi") {
    results.push(
      win.thirteenWait
        ? { name: "kokushi_musou_juusanmen", units: 2 }
        : { name: "kokushi_musou", units: 1 },
    );
  }
  if (win.form === "chiitoi") {
    const allHonor = win.pairTiles.every(Tile.isHonor);
    if (allHonor) {
      results.push({ name: "tsuuiisou", units: 1 });
    }
  }
  if (win.form === "standard") {
    results.push(...detectStandardYakuman(win, context));
  }
  if (results.length === 0) {
    return null;
  }
  const totalUnits = results.reduce((sum, result) => sum + result.units, 0);
  return {
    hits: results.map((result) => ({
      name: result.name,
      han: result.units * 13,
    })),
    yakumanUnits: Math.min(totalUnits, 2),
  };
};

const detectStandardOnlyYaku = (
  win: StandardWin,
  context: WinContext,
): ReadonlyArray<YakuHit> => {
  const hits: YakuHit[] = [];
  const menzen = Hand.isMenzen(win);
  const open = !menzen;
  const triplets = tripletLikeSets(win);
  const runs = runSets(win);
  const winByRon = context.winType === "ron";

  if (Yaku.isPinfu(win, context)) {
    hits.push({ name: "pinfu", han: 1 });
  }

  if (menzen) {
    const runCounts = new Map<number, number>();
    for (const run of runs) {
      runCounts.set(run.tile, (runCounts.get(run.tile) ?? 0) + 1);
    }
    const identicalRunPairs = [...runCounts.values()].reduce(
      (sum, count) => sum + Math.floor(count / 2),
      0,
    );
    if (identicalRunPairs >= 2) {
      hits.push({ name: "ryanpeikou", han: 3 });
    } else if (identicalRunPairs === 1) {
      hits.push({ name: "iipeiko", han: 1 });
    }
  }

  const seatWindTile = Tile.windIndex(context.seatWind);
  const roundWindTile = Tile.windIndex(context.roundWind);
  if (hasTripletOf(win, seatWindTile)) {
    hits.push({ name: "seat_wind", han: 1 });
  }
  if (hasTripletOf(win, roundWindTile)) {
    hits.push({ name: "round_wind", han: 1 });
  }
  DRAGON_INDEXES.forEach((tile, position) => {
    if (hasTripletOf(win, tile)) {
      hits.push({ name: DRAGON_NAMES[position], han: 1 });
    }
  });

  if (triplets.length === 4) {
    hits.push({ name: "toitoi", han: 2 });
  }
  if (countEffectiveConcealedTriplets(win, winByRon) === 3) {
    hits.push({ name: "sanankou", han: 2 });
  }
  if (win.sets.filter((set) => set.kind === "kan").length === 3) {
    hits.push({ name: "sankantsu", han: 2 });
  }

  const runStarts = new Set(runs.map((run) => run.tile));
  const hasSanshokuDoujun = [0, 1, 2, 3, 4, 5, 6].some((rank) =>
    [0, 9, 18].every((offset) => runStarts.has(offset + rank)),
  );
  if (hasSanshokuDoujun) {
    hits.push({ name: "sanshoku_doujun", han: open ? 1 : 2 });
  }
  const tripletTiles = new Set(triplets.map((set) => set.tile));
  const hasSanshokuDoukou = [0, 1, 2, 3, 4, 5, 6, 7, 8].some((rank) =>
    [0, 9, 18].every((offset) => tripletTiles.has(offset + rank)),
  );
  if (hasSanshokuDoukou) {
    hits.push({ name: "sanshoku_doukou", han: 2 });
  }
  const hasIttsu = [0, 9, 18].some((offset) =>
    [0, 3, 6].every((rank) => runStarts.has(offset + rank)),
  );
  if (hasIttsu) {
    hits.push({ name: "ittsu", han: open ? 1 : 2 });
  }

  if (isTerminalInEverySet(win)) {
    const tiles = Hand.tileIndexes(win);
    const hasHonor = tiles.some(Tile.isHonor);
    if (hasHonor) {
      hits.push({ name: "chanta", han: open ? 1 : 2 });
    } else {
      hits.push({ name: "junchan", han: open ? 2 : 3 });
    }
  }

  const dragonTriplets = DRAGON_INDEXES.filter((tile) =>
    hasTripletOf(win, tile),
  );
  if (dragonTriplets.length === 2 && Tile.isDragon(win.pairTile)) {
    hits.push({ name: "shousangen", han: 2 });
  }

  return hits;
};

const detectRegularYaku = (
  win: WinningHand,
  context: WinContext,
): ReadonlyArray<YakuHit> => {
  const hits: YakuHit[] = [];
  const menzen = Hand.isMenzen(win);
  const open = !menzen;
  const winByRon = context.winType === "ron";
  const tiles = Hand.tileIndexes(win);

  if (context.riichi === "double") {
    hits.push({ name: "double_riichi", han: 2 });
  } else if (context.riichi === "riichi") {
    hits.push({ name: "riichi", han: 1 });
  }
  if (context.ippatsu) {
    hits.push({ name: "ippatsu", han: 1 });
  }
  if (menzen && !winByRon) {
    hits.push({ name: "menzen_tsumo", han: 1 });
  }
  if (tiles.every(Tile.isSimple)) {
    hits.push({ name: "tanyao", han: 1 });
  }
  if (WinContext.hasSituational(context, "haitei") && !winByRon) {
    hits.push({ name: "haitei", han: 1 });
  }
  if (WinContext.hasSituational(context, "houtei") && winByRon) {
    hits.push({ name: "houtei", han: 1 });
  }
  if (WinContext.hasSituational(context, "rinshan") && !winByRon) {
    hits.push({ name: "rinshan", han: 1 });
  }
  if (WinContext.hasSituational(context, "chankan") && winByRon) {
    hits.push({ name: "chankan", han: 1 });
  }
  if (win.form === "chiitoi") {
    hits.push({ name: "chiitoitsu", han: 2 });
  }

  const hasHonor = tiles.some(Tile.isHonor);
  const hasTerminal = tiles.some(Tile.isTerminal);
  if (tiles.every(Tile.isYaochuu) && hasHonor && hasTerminal) {
    hits.push({ name: "honroutou", han: 2 });
  }
  const suits = new Set(
    tiles.filter((tile) => !Tile.isHonor(tile)).map((tile) => Math.floor(tile / 9)),
  );
  if (suits.size === 1) {
    if (hasHonor) {
      hits.push({ name: "honitsu", han: open ? 2 : 3 });
    } else {
      hits.push({ name: "chinitsu", han: open ? 5 : 6 });
    }
  }

  if (win.form === "standard") {
    hits.push(...detectStandardOnlyYaku(win, context));
  }
  return hits;
};

export const Yaku = {
  /**
   * 1つの和了解釈に対する役をすべて判定する。
   * ドラは役ではないため含まない(サービス層で加算する)。
   */
  detect(win: WinningHand, context: WinContext): YakuDetection {
    const yakuman = detectYakuman(win, context);
    if (yakuman !== null) {
      return yakuman;
    }
    return { hits: detectRegularYaku(win, context), yakumanUnits: 0 };
  },

  /** 平和(門前・全順子・役牌でない雀頭・両面待ち)かどうか。符計算からも参照される */
  isPinfu(win: WinningHand, context: WinContext): boolean {
    if (win.form !== "standard") {
      return false;
    }
    return (
      Hand.isMenzen(win) &&
      win.sets.every((set) => set.kind === "run") &&
      win.wait === "ryanmen" &&
      !isYakuhaiPair(win.pairTile, context)
    );
  },
} as const;
