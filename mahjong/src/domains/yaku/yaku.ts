import { Tile, type TileIndex } from "@/src/domains/tile";
import type {
  ChiitoitsuInterpretation,
  Interpretation,
  KokushiInterpretation,
  StandardInterpretation,
} from "@/src/domains/hand";

export type Situational =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

export type YakuName =
  | "riichi"
  | "double_riichi"
  | "ippatsu"
  | "menzen_tsumo"
  | "pinfu"
  | "tanyao"
  | "iipeiko"
  | "yakuhai_haku"
  | "yakuhai_hatsu"
  | "yakuhai_chun"
  | "seat_wind"
  | "round_wind"
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "chiitoitsu"
  | "toitoi"
  | "sanankou"
  | "sankantsu"
  | "sanshoku_doukou"
  | "sanshoku_doujun"
  | "ittsu"
  | "chanta"
  | "junchan"
  | "honroutou"
  | "shousangen"
  | "honitsu"
  | "chinitsu"
  | "ryanpeiko"
  | "dora"
  | "ura_dora"
  | "aka_dora";

export type YakumanName =
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
  | "suukantsu"
  | "tenhou"
  | "chihou";

export type YakuHit = Readonly<{ name: YakuName; han: number }>;

export type YakumanHit = Readonly<{ name: YakumanName; units: number }>;

/** 役判定の結果。yakuman が非空なら通常役は無効 */
export type Yaku = Readonly<{
  yaku: readonly YakuHit[];
  yakuman: readonly YakumanHit[];
}>;

/** 役判定・符計算に必要な和了時の状況 */
export type WinContext = Readonly<{
  winType: "tsumo" | "ron";
  seatWind: TileIndex;
  roundWind: TileIndex;
  menzen: boolean;
  riichi: "none" | "riichi" | "double";
  ippatsu: boolean;
  situational: readonly Situational[];
  winTile: TileIndex;
  /** 純手牌+副露牌の全牌(赤5表記を保持) */
  allTiles: readonly Tile[];
  /** 喰いタン採用ルール */
  kuitan: boolean;
}>;

const GREEN_TILES: ReadonlySet<TileIndex> = new Set(
  (["2s", "3s", "4s", "6s", "8s", "hatsu"] as const).map(Tile.toIndex),
);

const HAKU = Tile.toIndex("haku");
const HATSU = Tile.toIndex("hatsu");
const CHUN = Tile.toIndex("chun");

const allIndexes = (ctx: WinContext): readonly TileIndex[] =>
  ctx.allTiles.map(Tile.toIndex);

const detectSituational = (ctx: WinContext): readonly YakuHit[] => {
  const hits: YakuHit[] = [];
  if (ctx.riichi === "riichi") {
    hits.push({ name: "riichi", han: 1 });
  }
  if (ctx.riichi === "double") {
    hits.push({ name: "double_riichi", han: 2 });
  }
  if (ctx.ippatsu) {
    hits.push({ name: "ippatsu", han: 1 });
  }
  if (ctx.menzen && ctx.winType === "tsumo") {
    hits.push({ name: "menzen_tsumo", han: 1 });
  }
  if (ctx.situational.includes("haitei")) {
    hits.push({ name: "haitei", han: 1 });
  }
  if (ctx.situational.includes("houtei")) {
    hits.push({ name: "houtei", han: 1 });
  }
  if (ctx.situational.includes("rinshan")) {
    hits.push({ name: "rinshan", han: 1 });
  }
  if (ctx.situational.includes("chankan")) {
    hits.push({ name: "chankan", han: 1 });
  }
  return hits;
};

const detectTileComposition = (ctx: WinContext): readonly YakuHit[] => {
  const hits: YakuHit[] = [];
  const indexes = allIndexes(ctx);

  const allSimple = indexes.every(Tile.indexIsSimple);
  if (allSimple && (ctx.menzen || ctx.kuitan)) {
    hits.push({ name: "tanyao", han: 1 });
  }

  const allYaochuu = indexes.every(Tile.indexIsTerminalOrHonor);
  const hasHonor = indexes.some(Tile.indexIsHonor);
  const allHonor = indexes.every(Tile.indexIsHonor);
  const allTerminal = indexes.every(Tile.indexIsTerminal);
  // 字一色・清老頭は役満側で扱うため混老頭から除外する
  if (allYaochuu && !allHonor && !allTerminal) {
    hits.push({ name: "honroutou", han: 2 });
  }

  const suits = new Set(
    indexes.filter((i) => i < 27).map((i) => Math.floor(i / 9)),
  );
  if (suits.size === 1) {
    if (hasHonor) {
      hits.push({ name: "honitsu", han: ctx.menzen ? 3 : 2 });
    } else {
      hits.push({ name: "chinitsu", han: ctx.menzen ? 6 : 5 });
    }
  }

  return hits;
};

const detectCompositionYakuman = (ctx: WinContext): readonly YakumanHit[] => {
  const hits: YakumanHit[] = [];
  const indexes = allIndexes(ctx);
  if (indexes.every(Tile.indexIsHonor)) {
    hits.push({ name: "tsuuiisou", units: 1 });
  }
  if (indexes.every(Tile.indexIsTerminal)) {
    hits.push({ name: "chinroutou", units: 1 });
  }
  if (indexes.every((i) => GREEN_TILES.has(i))) {
    hits.push({ name: "ryuuiisou", units: 1 });
  }
  if (ctx.situational.includes("tenhou")) {
    hits.push({ name: "tenhou", units: 1 });
  }
  if (ctx.situational.includes("chihou")) {
    hits.push({ name: "chihou", units: 1 });
  }
  return hits;
};

const detectStandard = (
  interp: StandardInterpretation,
  ctx: WinContext,
): Yaku => {
  const hits: YakuHit[] = [];
  const yakuman: YakumanHit[] = [...detectCompositionYakuman(ctx)];

  const sets = interp.sets;
  const sequences = sets.filter((set) => set.kind === "sequence");
  const triplets = sets.filter((set) => set.kind !== "sequence");
  const quads = sets.filter((set) => set.kind === "quad");
  const concealedTriplets = triplets.filter((set) => set.concealed);

  // --- 役満 ---
  const dragonTriplets = triplets.filter((set) => Tile.indexIsDragon(set.tile));
  if (dragonTriplets.length === 3) {
    yakuman.push({ name: "daisangen", units: 1 });
  }
  const windTriplets = triplets.filter((set) => Tile.indexIsWind(set.tile));
  if (windTriplets.length === 4) {
    yakuman.push({ name: "daisuushii", units: 2 });
  } else if (windTriplets.length === 3 && Tile.indexIsWind(interp.pair)) {
    yakuman.push({ name: "shousuushii", units: 1 });
  }
  if (concealedTriplets.length === 4) {
    if (interp.wait === "tanki") {
      yakuman.push({ name: "suuankou_tanki", units: 2 });
    } else {
      yakuman.push({ name: "suuankou", units: 1 });
    }
  }
  if (quads.length === 4) {
    yakuman.push({ name: "suukantsu", units: 1 });
  }

  // 九蓮宝燈: 門前・槓なし・清一色で 1112345678999 + 1枚
  const indexes = allIndexes(ctx);
  const suits = new Set(
    indexes.filter((i) => i < 27).map((i) => Math.floor(i / 9)),
  );
  const noHonor = indexes.every((i) => i < 27);
  if (ctx.menzen && quads.length === 0 && noHonor && suits.size === 1) {
    const base = Math.floor(indexes[0] / 9) * 9;
    const counts = Array.from({ length: 9 }, () => 0);
    for (const i of indexes) {
      counts[i - base] += 1;
    }
    const pattern = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    const diffs = counts.map((count, n) => count - pattern[n]);
    if (diffs.every((d) => d >= 0) && diffs.reduce((a, b) => a + b, 0) === 1) {
      const junsei = diffs[ctx.winTile - base] === 1;
      yakuman.push(
        junsei
          ? { name: "junsei_chuuren_poutou", units: 2 }
          : { name: "chuuren_poutou", units: 1 },
      );
    }
  }

  if (yakuman.length > 0) {
    return { yaku: [], yakuman };
  }

  // --- 通常役 ---
  hits.push(...detectSituational(ctx));

  const pairIsYakuhai =
    Tile.indexIsDragon(interp.pair) ||
    interp.pair === ctx.seatWind ||
    interp.pair === ctx.roundWind;
  if (
    ctx.menzen &&
    sequences.length === 4 &&
    interp.wait === "ryanmen" &&
    !pairIsYakuhai
  ) {
    hits.push({ name: "pinfu", han: 1 });
  }

  if (ctx.menzen) {
    const seqCounts = new Map<TileIndex, number>();
    for (const seq of sequences) {
      seqCounts.set(seq.tile, (seqCounts.get(seq.tile) ?? 0) + 1);
    }
    const duplicatePairs = [...seqCounts.values()].reduce(
      (sum, count) => sum + Math.floor(count / 2),
      0,
    );
    if (duplicatePairs >= 2) {
      hits.push({ name: "ryanpeiko", han: 3 });
    } else if (duplicatePairs === 1) {
      hits.push({ name: "iipeiko", han: 1 });
    }
  }

  for (const set of triplets) {
    if (set.tile === HAKU) {
      hits.push({ name: "yakuhai_haku", han: 1 });
    }
    if (set.tile === HATSU) {
      hits.push({ name: "yakuhai_hatsu", han: 1 });
    }
    if (set.tile === CHUN) {
      hits.push({ name: "yakuhai_chun", han: 1 });
    }
    if (set.tile === ctx.seatWind) {
      hits.push({ name: "seat_wind", han: 1 });
    }
    if (set.tile === ctx.roundWind) {
      hits.push({ name: "round_wind", han: 1 });
    }
  }

  if (triplets.length === 4) {
    hits.push({ name: "toitoi", han: 2 });
  }
  if (concealedTriplets.length === 3) {
    hits.push({ name: "sanankou", han: 2 });
  }
  if (quads.length === 3) {
    hits.push({ name: "sankantsu", han: 2 });
  }

  const hasSanshokuDoujun = [0, 1, 2, 3, 4, 5, 6].some((n) =>
    [0, 9, 18].every((base) =>
      sequences.some((seq) => seq.tile === base + n),
    ),
  );
  if (hasSanshokuDoujun) {
    hits.push({ name: "sanshoku_doujun", han: ctx.menzen ? 2 : 1 });
  }

  const hasSanshokuDoukou = [0, 1, 2, 3, 4, 5, 6, 7, 8].some((n) =>
    [0, 9, 18].every((base) =>
      triplets.some((set) => set.tile === base + n),
    ),
  );
  if (hasSanshokuDoukou) {
    hits.push({ name: "sanshoku_doukou", han: 2 });
  }

  const hasIttsu = [0, 9, 18].some((base) =>
    [0, 3, 6].every((n) => sequences.some((seq) => seq.tile === base + n)),
  );
  if (hasIttsu) {
    hits.push({ name: "ittsu", han: ctx.menzen ? 2 : 1 });
  }

  const setHasYaochuu = (set: { kind: string; tile: TileIndex }): boolean =>
    set.kind === "sequence"
      ? set.tile % 9 === 0 || set.tile % 9 === 6
      : Tile.indexIsTerminalOrHonor(set.tile);
  const setHasTerminal = (set: { kind: string; tile: TileIndex }): boolean =>
    set.kind === "sequence"
      ? set.tile % 9 === 0 || set.tile % 9 === 6
      : Tile.indexIsTerminal(set.tile);
  const hasSequence = sequences.length > 0;
  if (hasSequence && sets.every(setHasYaochuu)) {
    const indexesAll = allIndexes(ctx);
    const anyHonor = indexesAll.some(Tile.indexIsHonor);
    if (
      !anyHonor &&
      sets.every(setHasTerminal) &&
      Tile.indexIsTerminal(interp.pair)
    ) {
      hits.push({ name: "junchan", han: ctx.menzen ? 3 : 2 });
    } else if (
      anyHonor &&
      Tile.indexIsTerminalOrHonor(interp.pair)
    ) {
      hits.push({ name: "chanta", han: ctx.menzen ? 2 : 1 });
    }
  }

  if (dragonTriplets.length === 2 && Tile.indexIsDragon(interp.pair)) {
    hits.push({ name: "shousangen", han: 2 });
  }

  hits.push(...detectTileComposition(ctx));

  return { yaku: hits, yakuman: [] };
};

const detectChiitoitsu = (
  _interp: ChiitoitsuInterpretation,
  ctx: WinContext,
): Yaku => {
  const yakuman = detectCompositionYakuman(ctx);
  if (yakuman.length > 0) {
    return { yaku: [], yakuman };
  }
  const hits: YakuHit[] = [
    ...detectSituational(ctx),
    { name: "chiitoitsu", han: 2 },
    ...detectTileComposition(ctx),
  ];
  return { yaku: hits, yakuman: [] };
};

const detectKokushi = (
  interp: KokushiInterpretation,
  ctx: WinContext,
): Yaku => {
  const yakuman: YakumanHit[] = [
    interp.thirteenWait
      ? { name: "kokushi_musou_juusanmen", units: 2 }
      : { name: "kokushi_musou", units: 1 },
  ];
  if (ctx.situational.includes("tenhou")) {
    yakuman.push({ name: "tenhou", units: 1 });
  }
  if (ctx.situational.includes("chihou")) {
    yakuman.push({ name: "chihou", units: 1 });
  }
  return { yaku: [], yakuman };
};

export const Yaku = {
  /** 1つの解釈に対して成立する役を判定する(ドラは含まない) */
  detect(interp: Interpretation, ctx: WinContext): Yaku {
    switch (interp.form) {
      case "standard":
        return detectStandard(interp, ctx);
      case "chiitoitsu":
        return detectChiitoitsu(interp, ctx);
      case "kokushi":
        return detectKokushi(interp, ctx);
    }
  },
} as const;
