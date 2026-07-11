import { Tile, TileSuit } from "./tile";
import { HandPartition, Meld, NormalPartition } from "./hand";

export type WinType = "tsumo" | "ron";
export type Wind = "ton" | "nan" | "sha" | "pei";
export type RoundWind = "ton" | "nan";
export type RiichiType = "none" | "riichi" | "double";

export type YakuContext = Readonly<{
  winTile: Tile;
  winType: WinType;
  seatWind: Wind;
  roundWind: RoundWind;
  riichi: RiichiType;
  ippatsu: boolean;
  situational: readonly string[]; // "haitei" | "houtei" | "rinshan" | "chankan" | "tenhou" | "chihou"
  isClosed: boolean;
}>;

export type YakuResult = Readonly<{
  name: string;
  han: number; // 13 for Yakuman, 26 for Double Yakuman
}>;

export const Yaku = {
  check(part: HandPartition, context: YakuContext): readonly YakuResult[] {
    // 1. Check Yakumans first
    const yakumans = Yaku.checkYakumans(part, context);
    if (yakumans.length > 0) {
      // Limit to double yakuman (factor of 2, 26 Han total)
      // Wait, let's return the yakuman list. The sum of their han can be at most 26.
      let totalYakumanHan = 0;
      const limitedYakumans: YakuResult[] = [];
      for (const y of yakumans) {
        if (totalYakumanHan + y.han <= 26) {
          limitedYakumans.push(y);
          totalYakumanHan += y.han;
        } else if (totalYakumanHan < 26) {
          // If we have room for one more but it would exceed, cap it
          limitedYakumans.push({ name: y.name, han: 26 - totalYakumanHan });
          totalYakumanHan = 26;
        }
      }
      return limitedYakumans;
    }

    // 2. Check normal yaku
    return Yaku.checkNormalYaku(part, context);
  },

  checkYakumans(part: HandPartition, context: YakuContext): readonly YakuResult[] {
    const list: YakuResult[] = [];

    // Tenhou / Chihou
    if (context.situational.includes("tenhou")) {
      list.push({ name: "tenhou", han: 13 });
    } else if (context.situational.includes("chihou")) {
      list.push({ name: "chihou", han: 13 });
    }

    if (part.type === "kokushi") {
      if (part.machi === "kokushi13") {
        list.push({ name: "kokushi_13", han: 26 });
      } else {
        list.push({ name: "kokushi", han: 13 });
      }
      return list; // Kokushi cannot combine with other shape-based Yakumans
    }

    // Get all tiles
    let allTiles: Tile[] = [];
    if (part.type === "chiitoitsu") {
      allTiles = part.pairs.flat();
    } else {
      allTiles = [...part.pair, ...part.closedMelds.flatMap(m => m.tiles), ...part.openMelds.flatMap(m => m.tiles)];
    }

    // Tsuuiisou (All Honors)
    if (allTiles.every(Tile.isHonor)) {
      list.push({ name: "tsuuiisou", han: 13 });
    }

    // Ryuuiisou (All Green)
    // Green tiles: 2s, 3s, 4s, 6s, 8s, hatsu
    const isGreen = (t: Tile): boolean => {
      if (t.suit === "z" && t.value === 6) return true; // Hatsu
      if (t.suit === "s" && [2, 3, 4, 6, 8].includes(t.value)) return true;
      return false;
    };
    if (allTiles.every(isGreen)) {
      list.push({ name: "ryuuiisou", han: 13 });
    }

    // Chinroutou (All Terminals)
    if (allTiles.every(Tile.isTerminal)) {
      list.push({ name: "chinroutou", han: 13 });
    }

    if (part.type === "normal") {
      // Daisangen
      const hasDaisangen = Yaku.countDragons(part) === 3;
      if (hasDaisangen) {
        list.push({ name: "daisangen", han: 13 });
      }

      // Wind Yakumans
      const windTriplets = Yaku.countWindTriplets(part);
      if (windTriplets === 4) {
        list.push({ name: "daisuushi", han: 26 });
      } else if (windTriplets === 3) {
        const missingWind = Yaku.getMissingWindForTriplets(part);
        if (missingWind && part.pair[0].suit === "z" && part.pair[0].value === missingWind) {
          list.push({ name: "shousuushi", han: 13 });
        }
      }

      // Suuankou / Suuankou Tanki
      const closedTripletsCount = Yaku.countClosedTriplets(part, context);
      if (closedTripletsCount === 4) {
        if (part.completedComponent.type === "pair") {
          list.push({ name: "suuankou_tanki", han: 26 });
        } else {
          list.push({ name: "suuankou", han: 13 });
        }
      }

      // Suukantsu (4 kongs)
      const kongCount = [...part.closedMelds, ...part.openMelds].filter(
        m => m.type === "kan" || m.type === "ankan"
      ).length;
      if (kongCount === 4) {
        list.push({ name: "suukantsu", han: 13 });
      }

      // Chuuren Poutou
      if (context.isClosed && allTiles.every(t => t.suit === allTiles[0].suit && t.suit !== "z")) {
        const suit = allTiles[0].suit;
        const counts = Array(10).fill(0);
        for (const t of allTiles) {
          counts[t.value]++;
        }
        if (counts[1] >= 3 && counts[9] >= 3 && [2, 3, 4, 5, 6, 7, 8].every(v => counts[v] >= 1)) {
          // Check if pure (9-sided wait):
          // If we remove the winTile, the remaining 13 tiles must be exactly 3 of 1, 3 of 9, and 1 of each 2-8.
          const tempCounts = [...counts];
          tempCounts[context.winTile.value]--;
          const isPure = tempCounts[1] === 3 && tempCounts[9] === 3 && [2, 3, 4, 5, 6, 7, 8].every(v => tempCounts[v] === 1);
          if (isPure) {
            list.push({ name: "pure_chuuren", han: 26 });
          } else {
            list.push({ name: "chuuren_poutou", han: 13 });
          }
        }
      }
    }

    return list;
  },

  checkNormalYaku(part: HandPartition, context: YakuContext): readonly YakuResult[] {
    const list: YakuResult[] = [];

    // 1. Riichi / Double Riichi
    if (context.riichi === "double") {
      list.push({ name: "double_riichi", han: 2 });
    } else if (context.riichi === "riichi") {
      list.push({ name: "riichi", han: 1 });
    }

    // 2. Ippatsu
    if (context.ippatsu && context.riichi !== "none") {
      list.push({ name: "ippatsu", han: 1 });
    }

    // 3. Menzen Tsumo
    if (context.isClosed && context.winType === "tsumo") {
      list.push({ name: "tsumo", han: 1 });
    }

    // Get all tiles
    let allTiles: Tile[] = [];
    if (part.type === "chiitoitsu") {
      allTiles = part.pairs.flat();
    } else if (part.type === "kokushi") {
      allTiles = [...part.tiles];
    } else if (part.type === "normal") {
      allTiles = [
        ...part.pair,
        ...part.closedMelds.flatMap((m: Meld) => m.tiles),
        ...part.openMelds.flatMap((m: Meld) => m.tiles)
      ];
    }

    // 4. Tanyao (All Simples)
    const isTanyao = allTiles.every(Tile.isSimple);
    if (isTanyao) {
      list.push({ name: "tanyao", han: 1 });
    }

    // 5. Chiitoitsu (Seven Pairs)
    if (part.type === "chiitoitsu") {
      list.push({ name: "chiitoitsu", han: 2 });
    }

    // Honroutou (All Terminals and Honors)
    const isHonroutou = allTiles.every(Tile.isTerminalOrHonor);
    if (isHonroutou) {
      list.push({ name: "honroutou", han: 2 });
    }

    // Honitsu / Chinitsu
    const nonHonorSuits = new Set(allTiles.filter(t => t.suit !== "z").map(t => t.suit));
    const hasHonors = allTiles.some(Tile.isHonor);
    if (nonHonorSuits.size === 1) {
      if (hasHonors) {
        list.push({ name: "honitsu", han: context.isClosed ? 3 : 2 });
      } else {
        list.push({ name: "chinitsu", han: context.isClosed ? 6 : 5 });
      }
    }

    // Situational
    if (context.situational.includes("rinshan")) {
      list.push({ name: "rinshan", han: 1 });
    }
    if (context.situational.includes("chankan")) {
      list.push({ name: "chankan", han: 1 });
    }
    if (context.situational.includes("haitei")) {
      list.push({ name: "haitei", han: 1 });
    }
    if (context.situational.includes("houtei")) {
      list.push({ name: "houtei", han: 1 });
    }

    if (part.type === "normal") {
      // 6. Pinfu
      if (context.isClosed && Yaku.checkPinfu(part, context)) {
        list.push({ name: "pinfu", han: 1 });
      }

      // 7. Value winds and dragons
      // White, Green, Red Dragons
      if (Yaku.hasTripletOf(part, "z", 5)) list.push({ name: "yaku_haku", han: 1 });
      if (Yaku.hasTripletOf(part, "z", 6)) list.push({ name: "yaku_hatsu", han: 1 });
      if (Yaku.hasTripletOf(part, "z", 7)) list.push({ name: "yaku_chun", han: 1 });

      // Seat / Round Winds
      const windValues: Record<Wind | RoundWind, number> = { ton: 1, nan: 2, sha: 3, pei: 4 };
      if (Yaku.hasTripletOf(part, "z", windValues[context.seatWind])) {
        list.push({ name: "yaku_wind_seat", han: 1 });
      }
      if (Yaku.hasTripletOf(part, "z", windValues[context.roundWind])) {
        list.push({ name: "yaku_wind_round", han: 1 });
      }

      // 8. Iipeiko / Ryanpeiko (closed only)
      if (context.isClosed) {
        const peikoCount = Yaku.countPeiko(part);
        if (peikoCount === 2) {
          list.push({ name: "ryanpeiko", han: 3 });
        } else if (peikoCount === 1) {
          list.push({ name: "iipeiko", han: 1 });
        }
      }

      // 9. Sanshoku Doujun (Three Color Runs)
      if (Yaku.hasSanshokuDoujun(part)) {
        list.push({ name: "sanshoku", han: context.isClosed ? 2 : 1 });
      }

      // 10. Ittsu (Straight)
      if (Yaku.hasIttsu(part)) {
        list.push({ name: "ittsu", han: context.isClosed ? 2 : 1 });
      }

      // 11. Toitoi (All Triplets)
      const allMelds = [...part.closedMelds, ...part.openMelds];
      const isToitoi = allMelds.every(m => m.type === "pon" || m.type === "kan" || m.type === "ankan");
      if (isToitoi) {
        list.push({ name: "toitoi", han: 2 });
      }

      // 12. Sanankou (3 Closed Triplets)
      if (Yaku.countClosedTriplets(part, context) === 3) {
        list.push({ name: "sanankou", han: 2 });
      }

      // 13. Sanshoku Doukou (Three Color Triplets)
      if (Yaku.hasSanshokuDoukou(part)) {
        list.push({ name: "sanshoku_doukou", han: 2 });
      }

      // 14. Sankantsu (3 Kongs)
      const kongCount = allMelds.filter(m => m.type === "kan" || m.type === "ankan").length;
      if (kongCount === 3) {
        list.push({ name: "sankantsu", han: 2 });
      }

      // 15. Chanta / Junchan
      const isChantaOrJunchan = allMelds.every(m => m.tiles.some(Tile.isTerminalOrHonor)) && Tile.isTerminalOrHonor(part.pair[0]);
      if (isChantaOrJunchan && !isHonroutou) {
        const hasHonorsInMeldsOrPair = allMelds.some(m => m.tiles.some(Tile.isHonor)) || Tile.isHonor(part.pair[0]);
        if (hasHonorsInMeldsOrPair) {
          list.push({ name: "chanta", han: context.isClosed ? 2 : 1 });
        } else {
          list.push({ name: "junchan", han: context.isClosed ? 3 : 2 });
        }
      }
    }

    return list;
  },

  checkPinfu(part: NormalPartition, context: YakuContext): boolean {
    // 4 Shuntsu, 1 Non-yaku pair, Ryanmen wait
    if (part.closedMelds.some(m => m.type !== "chi")) return false;
    if (part.machi !== "ryanmen") return false;

    // Pair cannot be valued wind or dragon
    const pairTile = part.pair[0];
    if (pairTile.suit === "z") {
      if (pairTile.value === 5 || pairTile.value === 6 || pairTile.value === 7) return false; // Dragon
      const windValues: Record<Wind | RoundWind, number> = { ton: 1, nan: 2, sha: 3, pei: 4 };
      if (pairTile.value === windValues[context.seatWind]) return false;
      if (pairTile.value === windValues[context.roundWind]) return false;
    }

    return true;
  },

  hasTripletOf(part: NormalPartition, suit: TileSuit, value: number): boolean {
    const allMelds = [...part.closedMelds, ...part.openMelds];
    return allMelds.some(
      m => (m.type === "pon" || m.type === "kan" || m.type === "ankan") &&
           m.tiles[0].suit === suit &&
           m.tiles[0].value === value
    );
  },

  countDragons(part: NormalPartition): number {
    let count = 0;
    if (Yaku.hasTripletOf(part, "z", 5)) count++; // Haku
    if (Yaku.hasTripletOf(part, "z", 6)) count++; // Hatsu
    if (Yaku.hasTripletOf(part, "z", 7)) count++; // Chun
    return count;
  },

  countWindTriplets(part: NormalPartition): number {
    let count = 0;
    for (let i = 1; i <= 4; i++) {
      if (Yaku.hasTripletOf(part, "z", i)) count++;
    }
    return count;
  },

  getMissingWindForTriplets(part: NormalPartition): number | null {
    const hasWind = Array(5).fill(false);
    for (let i = 1; i <= 4; i++) {
      if (Yaku.hasTripletOf(part, "z", i)) {
        hasWind[i] = true;
      }
    }
    const missing = [];
    for (let i = 1; i <= 4; i++) {
      if (!hasWind[i]) missing.push(i);
    }
    return missing.length === 1 ? missing[0] : null;
  },

  countClosedTriplets(part: NormalPartition, context: YakuContext): number {
    let count = 0;
    for (let i = 0; i < part.closedMelds.length; i++) {
      const m = part.closedMelds[i];
      if (m.type === "pon" || m.type === "kan" || m.type === "ankan") {
        if (m.type === "ankan") {
          count++;
        } else {
          // pon in closedMelds is closed, unless completed by Ron on Shanpon wait
          const isCompletedByRon =
            context.winType === "ron" &&
            part.completedComponent.type === "meld" &&
            part.completedComponent.index === i;
          if (!isCompletedByRon) {
            count++;
          }
        }
      }
    }
    return count;
  },

  countPeiko(part: NormalPartition): number {
    const runs = part.closedMelds.filter(m => m.type === "chi");
    const counts: Record<string, number> = {};
    for (const r of runs) {
      const sortedTiles = [...r.tiles].sort(Tile.compare);
      const key = `${sortedTiles[0].suit}${sortedTiles[0].value}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    let pairsCount = 0;
    for (const key in counts) {
      if (counts[key] >= 4) {
        pairsCount += 2;
      } else if (counts[key] >= 2) {
        pairsCount += 1;
      }
    }
    return pairsCount;
  },

  hasSanshokuDoujun(part: NormalPartition): boolean {
    const allMelds = [...part.closedMelds, ...part.openMelds];
    const runs = allMelds.filter(m => m.type === "chi");

    for (const r of runs) {
      if (r.tiles[0].suit === "m") {
        const val = [...r.tiles].map(t => t.value).sort((a,b)=>a-b)[0];
        // Check if we have runs starting with val in p and s
        const hasP = runs.some(x => x.tiles[0].suit === "p" && [...x.tiles].map(t => t.value).sort((a,b)=>a-b)[0] === val);
        const hasS = runs.some(x => x.tiles[0].suit === "s" && [...x.tiles].map(t => t.value).sort((a,b)=>a-b)[0] === val);
        if (hasP && hasS) return true;
      }
    }
    return false;
  },

  hasIttsu(part: NormalPartition): boolean {
    const allMelds = [...part.closedMelds, ...part.openMelds];
    const runs = allMelds.filter(m => m.type === "chi");

    for (const suit of ["m", "p", "s"] as const) {
      const startVals = runs
        .filter(r => r.tiles[0].suit === suit)
        .map(r => [...r.tiles].map(t => t.value).sort((a,b)=>a-b)[0]);
      if (startVals.includes(1) && startVals.includes(4) && startVals.includes(7)) {
        return true;
      }
    }
    return false;
  },

  hasSanshokuDoukou(part: NormalPartition): boolean {
    const allMelds = [...part.closedMelds, ...part.openMelds];
    const triplets = allMelds.filter(m => m.type === "pon" || m.type === "kan" || m.type === "ankan");

    for (const t of triplets) {
      if (t.tiles[0].suit === "m") {
        const val = t.tiles[0].value;
        const hasP = triplets.some(x => x.tiles[0].suit === "p" && x.tiles[0].value === val);
        const hasS = triplets.some(x => x.tiles[0].suit === "s" && x.tiles[0].value === val);
        if (hasP && hasS) return true;
      }
    }
    return false;
  }
} as const;
