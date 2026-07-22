import { Tile } from "../tile/index.ts";
import type {
  HandDecomposition,
  RegularDecomposition,
  ChiitoitsuDecomposition,
  KokushiDecomposition,
} from "../hand/index.ts";
import type {
  SeatWind,
  RoundWind,
  RiichiState,
  SituationalYaku,
} from "../../types/input.ts";
import type { YakuResult } from "../../types/output.ts";

export type YakuContext = Readonly<{
  seatWind: SeatWind;
  roundWind: RoundWind;
  dora: readonly Tile[];
  uraDora: readonly Tile[];
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly SituationalYaku[];
}>;

export const Yaku = {
  evaluate(
    decomp: HandDecomposition,
    ctx: YakuContext
  ): readonly YakuResult[] {
    if (decomp.shape === "kokushi") {
      return Yaku.evaluateKokushi(decomp, ctx);
    }
    if (decomp.shape === "chiitoitsu") {
      return Yaku.evaluateChiitoitsu(decomp, ctx);
    }
    return Yaku.evaluateRegular(decomp, ctx);
  },

  evaluateKokushi(
    decomp: KokushiDecomposition,
    ctx: YakuContext
  ): readonly YakuResult[] {
    const results: YakuResult[] = [];

    if (ctx.situational.includes("tenhou")) {
      results.push({ name: "tenhou", han: 13 });
    } else if (ctx.situational.includes("chihou")) {
      results.push({ name: "chihou", han: 13 });
    }

    if (decomp.isThirteenWait) {
      results.push({ name: "kokushi_musou_13", han: 26 });
    } else {
      results.push({ name: "kokushi_musou", han: 13 });
    }

    return results;
  },

  evaluateChiitoitsu(
    decomp: ChiitoitsuDecomposition,
    ctx: YakuContext
  ): readonly YakuResult[] {
    const yakumanList: YakuResult[] = [];

    if (ctx.situational.includes("tenhou")) {
      yakumanList.push({ name: "tenhou", han: 13 });
    } else if (ctx.situational.includes("chihou")) {
      yakumanList.push({ name: "chihou", han: 13 });
    }

    if (decomp.pairs.every(Tile.isHonor)) {
      yakumanList.push({ name: "tsuuiisou", han: 13 });
    }

    if (decomp.pairs.every(Tile.isGreen)) {
      yakumanList.push({ name: "ryuuiisou", han: 13 });
    }

    if (yakumanList.length > 0) {
      return Yaku.capYakuman(yakumanList);
    }

    const normalYaku: YakuResult[] = [];

    if (ctx.riichi === "double") {
      normalYaku.push({ name: "double_riichi", han: 2 });
    } else if (ctx.riichi === "riichi") {
      normalYaku.push({ name: "riichi", han: 1 });
    }

    if (ctx.ippatsu) {
      normalYaku.push({ name: "ippatsu", han: 1 });
    }

    if (decomp.winType === "tsumo") {
      normalYaku.push({ name: "menzen_tsumo", han: 1 });
    }

    if (ctx.situational.includes("haitei")) {
      normalYaku.push({ name: "haitei_raoyue", han: 1 });
    }
    if (ctx.situational.includes("houtei")) {
      normalYaku.push({ name: "houtei_raoyui", han: 1 });
    }

    normalYaku.push({ name: "chiitoitsu", han: 2 });

    if (decomp.pairs.every(Tile.isSimple)) {
      normalYaku.push({ name: "tanyao", han: 1 });
    }

    const suits = new Set(decomp.pairs.filter((t) => !Tile.isHonor(t)).map((t) => t.suit));
    const hasHonors = decomp.pairs.some(Tile.isHonor);
    if (suits.size === 1) {
      if (hasHonors) {
        normalYaku.push({ name: "honitsu", han: 3 });
      } else {
        normalYaku.push({ name: "chinitsu", han: 6 });
      }
    }

    if (decomp.pairs.every(Tile.isTerminalOrHonor)) {
      normalYaku.push({ name: "honroto", han: 2 });
    }

    Yaku.addDoraYaku(decomp.pairs, ctx, normalYaku);

    return normalYaku;
  },

  evaluateRegular(
    decomp: RegularDecomposition,
    ctx: YakuContext
  ): readonly YakuResult[] {
    const yakumanList: YakuResult[] = [];

    if (ctx.situational.includes("tenhou")) {
      yakumanList.push({ name: "tenhou", han: 13 });
    } else if (ctx.situational.includes("chihou")) {
      yakumanList.push({ name: "chihou", han: 13 });
    }

    const concealedKoutsuCount = decomp.sets.filter(
      (s) => (s.type === "koutsu" || s.type === "kantsu") && s.isConcealed
    ).length;

    if (concealedKoutsuCount === 4) {
      if (decomp.pair.isTankiWait) {
        yakumanList.push({ name: "suankou_tanki", han: 26 });
      } else {
        yakumanList.push({ name: "suankou", han: 13 });
      }
    }

    const dragonKoutsuCount = decomp.sets.filter(
      (s) =>
        (s.type === "koutsu" || s.type === "kantsu") &&
        s.tiles[0].suit === "z" &&
        s.tiles[0].value >= 5
    ).length;
    if (dragonKoutsuCount === 3) {
      yakumanList.push({ name: "daisangen", han: 13 });
    }

    const windKoutsuCount = decomp.sets.filter(
      (s) =>
        (s.type === "koutsu" || s.type === "kantsu") &&
        s.tiles[0].suit === "z" &&
        s.tiles[0].value <= 4
    ).length;
    const windPair =
      decomp.pair.tile.suit === "z" && decomp.pair.tile.value <= 4;
    if (windKoutsuCount === 4) {
      yakumanList.push({ name: "daisoushi", han: 26 });
    } else if (windKoutsuCount === 3 && windPair) {
      yakumanList.push({ name: "shousoushi", han: 13 });
    }

    const allTiles = [
      ...decomp.sets.flatMap((s) => s.tiles),
      decomp.pair.tile,
      decomp.pair.tile,
    ];
    if (allTiles.every(Tile.isHonor)) {
      yakumanList.push({ name: "tsuuiisou", han: 13 });
    }

    if (allTiles.every(Tile.isGreen)) {
      yakumanList.push({ name: "ryuuiisou", han: 13 });
    }

    if (allTiles.every(Tile.isTerminal)) {
      yakumanList.push({ name: "chinroto", han: 13 });
    }

    const kantsuCount = decomp.sets.filter((s) => s.type === "kantsu").length;
    if (kantsuCount === 4) {
      yakumanList.push({ name: "sukantsu", han: 13 });
    }

    if (decomp.isMenzen) {
      const chuurenRes = Yaku.checkChuuren(allTiles, decomp.winTile);
      if (chuurenRes) {
        yakumanList.push(chuurenRes);
      }
    }

    if (yakumanList.length > 0) {
      return Yaku.capYakuman(yakumanList);
    }

    const normalYaku: YakuResult[] = [];

    if (ctx.riichi === "double") {
      normalYaku.push({ name: "double_riichi", han: 2 });
    } else if (ctx.riichi === "riichi") {
      normalYaku.push({ name: "riichi", han: 1 });
    }

    if (ctx.ippatsu) {
      normalYaku.push({ name: "ippatsu", han: 1 });
    }

    if (decomp.isMenzen && decomp.winType === "tsumo") {
      normalYaku.push({ name: "menzen_tsumo", han: 1 });
    }

    if (ctx.situational.includes("haitei")) {
      normalYaku.push({ name: "haitei_raoyue", han: 1 });
    }
    if (ctx.situational.includes("houtei")) {
      normalYaku.push({ name: "houtei_raoyui", han: 1 });
    }
    if (ctx.situational.includes("rinshan")) {
      normalYaku.push({ name: "rinshan_kaihou", han: 1 });
    }
    if (ctx.situational.includes("chankan")) {
      normalYaku.push({ name: "chankan", han: 1 });
    }

    if (decomp.isMenzen && decomp.sets.every((s) => s.type === "shuntsu")) {
      const pairTile = decomp.pair.tile;
      const isValuedHonor =
        pairTile.suit === "z" &&
        (pairTile.value >= 5 ||
          pairTile.value === Yaku.windToNumber(ctx.seatWind) ||
          pairTile.value === Yaku.windToNumber(ctx.roundWind));

      if (!isValuedHonor) {
        const winSet = decomp.sets.find((s) => s.containsWinTile);
        if (winSet && winSet.waitType === "ryanmen") {
          normalYaku.push({ name: "pinfu", han: 1 });
        }
      }
    }

    if (allTiles.every(Tile.isSimple)) {
      normalYaku.push({ name: "tanyao", han: 1 });
    }

    if (decomp.isMenzen) {
      const shuntsuList = decomp.sets.filter((s) => s.type === "shuntsu");
      const shuntsuStrings = shuntsuList.map((s) =>
        s.tiles.map((t) => `${t.suit}${t.value}`).join("")
      );
      const counts = new Map<string, number>();
      for (const str of shuntsuStrings) {
        counts.set(str, (counts.get(str) ?? 0) + 1);
      }
      let pairsOfShuntsu = 0;
      for (const c of counts.values()) {
        if (c >= 2) pairsOfShuntsu += Math.floor(c / 2);
      }

      if (pairsOfShuntsu === 2) {
        normalYaku.push({ name: "ryanpeko", han: 3 });
      } else if (pairsOfShuntsu === 1) {
        normalYaku.push({ name: "ipeko", han: 1 });
      }
    }

    for (const set of decomp.sets) {
      if (set.type === "koutsu" || set.type === "kantsu") {
        const t = set.tiles[0];
        if (t.suit === "z") {
          if (t.value === 5) normalYaku.push({ name: "yakuhai_haku", han: 1 });
          if (t.value === 6) normalYaku.push({ name: "yakuhai_hatsu", han: 1 });
          if (t.value === 7) normalYaku.push({ name: "yakuhai_chun", han: 1 });
          if (t.value === Yaku.windToNumber(ctx.seatWind)) {
            normalYaku.push({ name: "yakuhai_seat", han: 1 });
          }
          if (t.value === Yaku.windToNumber(ctx.roundWind)) {
            normalYaku.push({ name: "yakuhai_round", han: 1 });
          }
        }
      }
    }

    const shuntsus = decomp.sets.filter((s) => s.type === "shuntsu");
    if (shuntsus.length >= 3) {
      const valMap = new Map<number, Set<string>>();
      for (const s of shuntsus) {
        const minVal = Math.min(...s.tiles.map((t) => t.value));
        const suit = s.tiles[0].suit;
        if (!valMap.has(minVal)) valMap.set(minVal, new Set());
        valMap.get(minVal)!.add(suit);
      }
      for (const suitsSet of valMap.values()) {
        if (suitsSet.has("m") && suitsSet.has("p") && suitsSet.has("s")) {
          normalYaku.push({
            name: "sanshoku_doujun",
            han: decomp.isMenzen ? 2 : 1,
          });
          break;
        }
      }
    }

    for (const suit of ["m", "p", "s"] as const) {
      const has123 = shuntsus.some(
        (s) => s.tiles[0].suit === suit && Math.min(...s.tiles.map((t) => t.value)) === 1
      );
      const has456 = shuntsus.some(
        (s) => s.tiles[0].suit === suit && Math.min(...s.tiles.map((t) => t.value)) === 4
      );
      const has789 = shuntsus.some(
        (s) => s.tiles[0].suit === suit && Math.min(...s.tiles.map((t) => t.value)) === 7
      );

      if (has123 && has456 && has789) {
        normalYaku.push({
          name: "ittsu",
          han: decomp.isMenzen ? 2 : 1,
        });
        break;
      }
    }

    const koutsuCount = decomp.sets.filter(
      (s) => s.type === "koutsu" || s.type === "kantsu"
    ).length;
    if (koutsuCount === 4) {
      normalYaku.push({ name: "toitoi", han: 2 });
    }

    if (concealedKoutsuCount === 3) {
      normalYaku.push({ name: "sanankou", han: 2 });
    }

    const koutsus = decomp.sets.filter(
      (s) => s.type === "koutsu" || s.type === "kantsu"
    );
    if (koutsus.length >= 3) {
      const valMap = new Map<number, Set<string>>();
      for (const k of koutsus) {
        const val = k.tiles[0].value;
        const suit = k.tiles[0].suit;
        if (suit !== "z") {
          if (!valMap.has(val)) valMap.set(val, new Set());
          valMap.get(val)!.add(suit);
        }
      }
      for (const suitsSet of valMap.values()) {
        if (suitsSet.has("m") && suitsSet.has("p") && suitsSet.has("s")) {
          normalYaku.push({ name: "sanshoku_doukou", han: 2 });
          break;
        }
      }
    }

    if (kantsuCount === 3) {
      normalYaku.push({ name: "sankantsu", han: 2 });
    }

    const hasShuntsu = decomp.sets.some((s) => s.type === "shuntsu");
    const allSetsAndPairTerminalOrHonor =
      decomp.sets.every((s) => s.tiles.some(Tile.isTerminalOrHonor)) &&
      Tile.isTerminalOrHonor(decomp.pair.tile);

    const hasHonorTile = allTiles.some(Tile.isHonor);

    if (allSetsAndPairTerminalOrHonor) {
      if (allTiles.every(Tile.isTerminalOrHonor) && !hasShuntsu) {
        normalYaku.push({ name: "honroto", han: 2 });
      } else if (hasHonorTile && hasShuntsu) {
        normalYaku.push({
          name: "chanta",
          han: decomp.isMenzen ? 2 : 1,
        });
      } else if (!hasHonorTile && hasShuntsu) {
        normalYaku.push({
          name: "junchan",
          han: decomp.isMenzen ? 3 : 2,
        });
      }
    }

    if (dragonKoutsuCount === 2 && decomp.pair.tile.suit === "z" && decomp.pair.tile.value >= 5) {
      normalYaku.push({ name: "shousangen", han: 2 });
    }

    const suits = new Set(allTiles.filter((t) => !Tile.isHonor(t)).map((t) => t.suit));
    if (suits.size === 1) {
      if (hasHonorTile) {
        normalYaku.push({
          name: "honitsu",
          han: decomp.isMenzen ? 3 : 2,
        });
      } else {
        normalYaku.push({
          name: "chinitsu",
          han: decomp.isMenzen ? 6 : 5,
        });
      }
    }

    Yaku.addDoraYaku(allTiles, ctx, normalYaku);

    return normalYaku;
  },

  addDoraYaku(
    allTiles: readonly Tile[],
    ctx: YakuContext,
    results: YakuResult[]
  ): void {
    const akaDoraCount = allTiles.filter((t) => t.isRed).length;
    const doraCount = allTiles.reduce(
      (acc, t) => acc + ctx.dora.filter((d) => Tile.equals(t, d)).length,
      0
    );

    let uradoraCount = 0;
    if (ctx.riichi !== "none") {
      uradoraCount = allTiles.reduce(
        (acc, t) => acc + ctx.uraDora.filter((u) => Tile.equals(t, u)).length,
        0
      );
    }

    if (doraCount > 0) {
      results.push({ name: "dora", han: doraCount });
    }
    if (uradoraCount > 0) {
      results.push({ name: "uradora", han: uradoraCount });
    }
    if (akaDoraCount > 0) {
      results.push({ name: "akadora", han: akaDoraCount });
    }
  },

  checkChuuren(tiles: readonly Tile[], winTile: Tile): YakuResult | null {
    const suits = new Set(tiles.map((t) => t.suit));
    if (suits.size !== 1 || suits.has("z")) return null;

    const values = tiles.map((t) => t.value).sort((a, b) => a - b);
    if (values.length !== 14) return null;

    const req = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
    const counts = new Array(10).fill(0);
    for (const v of values) counts[v]++;

    for (let i = 1; i <= 9; i++) {
      if (counts[i] < req[i]) return null;
    }

    const handWithoutWin = [...values];
    const winIdx = handWithoutWin.indexOf(winTile.value);
    if (winIdx >= 0) {
      handWithoutWin.splice(winIdx, 1);
    }
    const countsNoWin = new Array(10).fill(0);
    for (const v of handWithoutWin) countsNoWin[v]++;

    let isPure = true;
    for (let i = 1; i <= 9; i++) {
      if (countsNoWin[i] !== req[i]) {
        isPure = false;
        break;
      }
    }

    if (isPure) {
      return { name: "junseki_chuuren_poutou", han: 26 };
    }
    return { name: "chuuren_poutou", han: 13 };
  },

  capYakuman(list: readonly YakuResult[]): readonly YakuResult[] {
    const totalHan = list.reduce((acc, y) => acc + y.han, 0);
    if (totalHan >= 26) {
      return list;
    }
    return list;
  },

  windToNumber(wind: SeatWind | RoundWind): number {
    switch (wind) {
      case "ton":
        return 1;
      case "nan":
        return 2;
      case "sha":
        return 3;
      case "pei":
        return 4;
    }
  },
} as const;
