import { Tile } from "../tile/index.ts";
import type { TileKind } from "../tile/index.ts";
import type {
  WinningHand,
  StandardWin,
  ChiitoitsuWin,
  KokushiWin,
  HandSet,
} from "../hand/index.ts";
import { WinContext } from "../win-context/index.ts";

export type YakuEntry = Readonly<{
  name: string;
  han: number;
}>;

export type YakuResult =
  | Readonly<{ kind: "yakuman"; yaku: readonly YakuEntry[]; multiplier: number }>
  | Readonly<{ kind: "normal"; yaku: readonly YakuEntry[] }>;

const YAKUMAN_HAN = 13;
const DOUBLE_YAKUMAN_HAN = 26;

const HAKU_KIND = 31;
const HATSU_KIND = 32;
const CHUN_KIND = 33;

const isDragonKind = (kind: TileKind): boolean => kind >= HAKU_KIND;
const isWindKind = (kind: TileKind): boolean => kind >= 27 && kind <= 30;
const isTerminalKind = (kind: TileKind): boolean =>
  !Tile.isHonorKind(kind) && (Tile.rankOfKind(kind) === 1 || Tile.rankOfKind(kind) === 9);
const isGreenKind = (kind: TileKind): boolean => Tile.isGreen(Tile.fromKindIndex(kind));

/** 面子・雀頭に現れる牌種(枚数は無視) */
const kindsOfStandard = (win: StandardWin): readonly TileKind[] => {
  const kinds: TileKind[] = [win.pairKind];
  for (const set of win.sets) {
    if (set.kind === "run") {
      kinds.push(set.tileKind, set.tileKind + 1, set.tileKind + 2);
    } else {
      kinds.push(set.tileKind);
    }
  }
  return kinds;
};

const setContainsYaochuu = (set: HandSet): boolean => {
  if (set.kind === "run") {
    const rank = Tile.rankOfKind(set.tileKind);
    return rank === 1 || rank === 7;
  }
  return Tile.isYaochuuKind(set.tileKind);
};

const CHUUREN_PATTERN = [3, 1, 1, 1, 1, 1, 1, 1, 3] as const;

const detectChuuren = (win: StandardWin): "junsei" | "chuuren" | null => {
  if (win.sets.some((set) => set.fromMeld)) {
    return null;
  }
  const counts = win.concealedCounts;
  const suitOffsets = [0, 9, 18];
  for (let kind = 27; kind < 34; kind += 1) {
    if (counts[kind] > 0) {
      return null;
    }
  }
  const usedOffsets = suitOffsets.filter((offset) =>
    counts.slice(offset, offset + 9).some((count) => count > 0),
  );
  if (usedOffsets.length !== 1) {
    return null;
  }
  const offset = usedOffsets[0];
  const suitCounts = counts.slice(offset, offset + 9);
  if (!CHUUREN_PATTERN.every((minimum, index) => suitCounts[index] >= minimum)) {
    return null;
  }
  const winIndex = win.winKind - offset;
  const isJunsei = CHUUREN_PATTERN.every((minimum, index) =>
    index === winIndex ? suitCounts[index] === minimum + 1 : suitCounts[index] === minimum,
  );
  return isJunsei ? "junsei" : "chuuren";
};

const situationalYakuman = (context: WinContext): YakuEntry[] => {
  const entries: YakuEntry[] = [];
  if (WinContext.has(context, "tenhou")) {
    entries.push({ name: "tenhou", han: YAKUMAN_HAN });
  }
  if (WinContext.has(context, "chihou")) {
    entries.push({ name: "chihou", han: YAKUMAN_HAN });
  }
  return entries;
};

const detectStandardYakuman = (win: StandardWin, context: WinContext): YakuEntry[] => {
  const entries: YakuEntry[] = [...situationalYakuman(context)];
  const sets = win.sets;
  const tripletLikes = sets.filter((set) => set.kind !== "run");
  const kans = sets.filter((set) => set.kind === "kan");
  const allKinds = kindsOfStandard(win);

  if (kans.length === 4) {
    entries.push({ name: "suukantsu", han: YAKUMAN_HAN });
  }
  if (tripletLikes.length === 4 && tripletLikes.every((set) => set.concealed)) {
    if (win.wait === "tanki") {
      entries.push({ name: "suuankou_tanki", han: DOUBLE_YAKUMAN_HAN });
    } else {
      entries.push({ name: "suuankou", han: YAKUMAN_HAN });
    }
  }
  const dragonTriplets = tripletLikes.filter((set) => isDragonKind(set.tileKind));
  if (dragonTriplets.length === 3) {
    entries.push({ name: "daisangen", han: YAKUMAN_HAN });
  }
  const windTriplets = tripletLikes.filter((set) => isWindKind(set.tileKind));
  if (windTriplets.length === 4) {
    entries.push({ name: "daisuushii", han: DOUBLE_YAKUMAN_HAN });
  } else if (windTriplets.length === 3 && isWindKind(win.pairKind)) {
    entries.push({ name: "shousuushii", han: YAKUMAN_HAN });
  }
  if (allKinds.every((kind) => Tile.isHonorKind(kind))) {
    entries.push({ name: "tsuuiisou", han: YAKUMAN_HAN });
  }
  if (allKinds.every((kind) => isTerminalKind(kind))) {
    entries.push({ name: "chinroutou", han: YAKUMAN_HAN });
  }
  if (allKinds.every((kind) => isGreenKind(kind))) {
    entries.push({ name: "ryuuiisou", han: YAKUMAN_HAN });
  }
  const chuuren = detectChuuren(win);
  if (chuuren === "junsei") {
    entries.push({ name: "junsei_chuuren_poutou", han: DOUBLE_YAKUMAN_HAN });
  } else if (chuuren === "chuuren") {
    entries.push({ name: "chuuren_poutou", han: YAKUMAN_HAN });
  }
  return entries;
};

const detectChiitoitsuYakuman = (win: ChiitoitsuWin, context: WinContext): YakuEntry[] => {
  const entries: YakuEntry[] = [...situationalYakuman(context)];
  if (win.pairKinds.every((kind) => Tile.isHonorKind(kind))) {
    entries.push({ name: "tsuuiisou", han: YAKUMAN_HAN });
  }
  return entries;
};

const detectKokushiYakuman = (win: KokushiWin, context: WinContext): YakuEntry[] => {
  const entries: YakuEntry[] = [...situationalYakuman(context)];
  if (win.thirteenWait) {
    entries.push({ name: "kokushi_musou_juusanmen", han: DOUBLE_YAKUMAN_HAN });
  } else {
    entries.push({ name: "kokushi_musou", han: YAKUMAN_HAN });
  }
  return entries;
};

/** リーチ・状況などの手牌形に依存しない役 */
const contextYaku = (context: WinContext): YakuEntry[] => {
  const entries: YakuEntry[] = [];
  if (context.riichi === "double") {
    entries.push({ name: "double_riichi", han: 2 });
  } else if (context.riichi === "riichi") {
    entries.push({ name: "riichi", han: 1 });
  }
  if (context.ippatsu) {
    entries.push({ name: "ippatsu", han: 1 });
  }
  if (context.menzen && context.winType === "tsumo") {
    entries.push({ name: "menzen_tsumo", han: 1 });
  }
  if (WinContext.has(context, "haitei")) {
    entries.push({ name: "haitei_raoyue", han: 1 });
  }
  if (WinContext.has(context, "houtei")) {
    entries.push({ name: "houtei_raoyui", han: 1 });
  }
  if (WinContext.has(context, "rinshan")) {
    entries.push({ name: "rinshan_kaihou", han: 1 });
  }
  if (WinContext.has(context, "chankan")) {
    entries.push({ name: "chankan", han: 1 });
  }
  return entries;
};

/** 染め手(混一色・清一色)の判定。対象外は null */
const flushYaku = (kinds: readonly TileKind[], menzen: boolean): YakuEntry | null => {
  const suits = new Set(
    kinds.filter((kind) => !Tile.isHonorKind(kind)).map((kind) => Tile.suitOfKind(kind)),
  );
  if (suits.size !== 1) {
    return null;
  }
  const hasHonor = kinds.some((kind) => Tile.isHonorKind(kind));
  if (hasHonor) {
    return { name: "honitsu", han: menzen ? 3 : 2 };
  }
  return { name: "chinitsu", han: menzen ? 6 : 5 };
};

const detectStandardYaku = (win: StandardWin, context: WinContext): YakuEntry[] => {
  const menzen = context.menzen;
  const entries: YakuEntry[] = [...contextYaku(context)];
  const sets = win.sets;
  const runs = sets.filter((set) => set.kind === "run");
  const tripletLikes = sets.filter((set) => set.kind !== "run");
  const kans = sets.filter((set) => set.kind === "kan");
  const allKinds = kindsOfStandard(win);
  const seatWindKind = WinContext.windTileKind(context.seatWind);
  const roundWindKind = WinContext.windTileKind(context.roundWind);

  const pairIsYakuhai =
    isDragonKind(win.pairKind) ||
    win.pairKind === seatWindKind ||
    win.pairKind === roundWindKind;
  if (menzen && runs.length === 4 && win.wait === "ryanmen" && !pairIsYakuhai) {
    entries.push({ name: "pinfu", han: 1 });
  }
  if (allKinds.every((kind) => !Tile.isYaochuuKind(kind))) {
    entries.push({ name: "tanyao", han: 1 });
  }
  if (menzen) {
    const runCounts = new Map<TileKind, number>();
    for (const run of runs) {
      runCounts.set(run.tileKind, (runCounts.get(run.tileKind) ?? 0) + 1);
    }
    let peikou = 0;
    for (const count of runCounts.values()) {
      peikou += Math.floor(count / 2);
    }
    if (peikou === 2) {
      entries.push({ name: "ryanpeiko", han: 3 });
    } else if (peikou === 1) {
      entries.push({ name: "iipeiko", han: 1 });
    }
  }
  for (const set of tripletLikes) {
    if (set.tileKind === seatWindKind) {
      entries.push({ name: "seat_wind", han: 1 });
    }
    if (set.tileKind === roundWindKind) {
      entries.push({ name: "round_wind", han: 1 });
    }
    if (set.tileKind === HAKU_KIND) {
      entries.push({ name: "yakuhai_haku", han: 1 });
    }
    if (set.tileKind === HATSU_KIND) {
      entries.push({ name: "yakuhai_hatsu", han: 1 });
    }
    if (set.tileKind === CHUN_KIND) {
      entries.push({ name: "yakuhai_chun", han: 1 });
    }
  }
  const runKinds = new Set(runs.map((run) => run.tileKind));
  for (let rank = 1; rank <= 7; rank += 1) {
    if (runKinds.has(rank - 1) && runKinds.has(9 + rank - 1) && runKinds.has(18 + rank - 1)) {
      entries.push({ name: "sanshoku_doujun", han: menzen ? 2 : 1 });
      break;
    }
  }
  const tripletKinds = new Set(tripletLikes.map((set) => set.tileKind));
  for (let rank = 1; rank <= 9; rank += 1) {
    if (
      tripletKinds.has(rank - 1) &&
      tripletKinds.has(9 + rank - 1) &&
      tripletKinds.has(18 + rank - 1)
    ) {
      entries.push({ name: "sanshoku_doukou", han: 2 });
      break;
    }
  }
  for (const offset of [0, 9, 18]) {
    if (runKinds.has(offset) && runKinds.has(offset + 3) && runKinds.has(offset + 6)) {
      entries.push({ name: "ittsu", han: menzen ? 2 : 1 });
      break;
    }
  }
  const everySetYaochuu =
    sets.every(setContainsYaochuu) && Tile.isYaochuuKind(win.pairKind);
  if (everySetYaochuu && runs.length > 0) {
    const hasHonor = allKinds.some((kind) => Tile.isHonorKind(kind));
    if (hasHonor) {
      entries.push({ name: "chanta", han: menzen ? 2 : 1 });
    } else {
      entries.push({ name: "junchan", han: menzen ? 3 : 2 });
    }
  }
  if (runs.length === 0) {
    entries.push({ name: "toitoi", han: 2 });
  }
  if (tripletLikes.filter((set) => set.concealed).length === 3) {
    entries.push({ name: "sanankou", han: 2 });
  }
  if (kans.length === 3) {
    entries.push({ name: "sankantsu", han: 2 });
  }
  if (allKinds.every((kind) => Tile.isYaochuuKind(kind)) && runs.length === 0) {
    entries.push({ name: "honroutou", han: 2 });
  }
  const dragonTriplets = tripletLikes.filter((set) => isDragonKind(set.tileKind));
  if (dragonTriplets.length === 2 && isDragonKind(win.pairKind)) {
    entries.push({ name: "shousangen", han: 2 });
  }
  const flush = flushYaku(allKinds, menzen);
  if (flush !== null) {
    entries.push(flush);
  }
  return entries;
};

const detectChiitoitsuYaku = (win: ChiitoitsuWin, context: WinContext): YakuEntry[] => {
  const entries: YakuEntry[] = [...contextYaku(context)];
  entries.push({ name: "chiitoitsu", han: 2 });
  if (win.pairKinds.every((kind) => !Tile.isYaochuuKind(kind))) {
    entries.push({ name: "tanyao", han: 1 });
  }
  if (win.pairKinds.every((kind) => Tile.isYaochuuKind(kind))) {
    entries.push({ name: "honroutou", han: 2 });
  }
  const flush = flushYaku(win.pairKinds, true);
  if (flush !== null) {
    entries.push(flush);
  }
  return entries;
};

export const Yaku = {
  /** 和了形1解釈に対する役を判定する。役満があれば通常役は含めない */
  detect(win: WinningHand, context: WinContext): YakuResult {
    const yakumanEntries =
      win.form === "standard"
        ? detectStandardYakuman(win, context)
        : win.form === "chiitoitsu"
          ? detectChiitoitsuYakuman(win, context)
          : detectKokushiYakuman(win, context);
    if (yakumanEntries.length > 0) {
      const multiplier = yakumanEntries.reduce(
        (sum, entry) => sum + entry.han / YAKUMAN_HAN,
        0,
      );
      return { kind: "yakuman", yaku: yakumanEntries, multiplier };
    }
    const yaku =
      win.form === "standard"
        ? detectStandardYaku(win, context)
        : win.form === "chiitoitsu"
          ? detectChiitoitsuYaku(win, context)
          : [];
    return { kind: "normal", yaku };
  },

  totalHan(entries: readonly YakuEntry[]): number {
    return entries.reduce((sum, entry) => sum + entry.han, 0);
  },
} as const;
