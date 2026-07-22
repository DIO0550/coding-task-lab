import { Tile } from "../tile/index.ts";
import { Meld } from "../meld/index.ts";
import type { MeldInput, WinType } from "../../types/input.ts";

export type MeldSetType = "shuntsu" | "koutsu" | "kantsu";

export type HandSet = Readonly<{
  type: MeldSetType;
  tiles: readonly Tile[];
  isConcealed: boolean;
  containsWinTile: boolean;
  waitType?: "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";
}>;

export type HandPair = Readonly<{
  tile: Tile;
  containsWinTile: boolean;
  isTankiWait: boolean;
}>;

export type RegularDecomposition = Readonly<{
  shape: "regular";
  pair: HandPair;
  sets: readonly HandSet[];
  winTile: Tile;
  winType: WinType;
  isMenzen: boolean;
}>;

export type ChiitoitsuDecomposition = Readonly<{
  shape: "chiitoitsu";
  pairs: readonly Tile[];
  winTile: Tile;
  winType: WinType;
  isMenzen: boolean;
}>;

export type KokushiDecomposition = Readonly<{
  shape: "kokushi";
  tiles: readonly Tile[];
  pairTile: Tile;
  isThirteenWait: boolean;
  winTile: Tile;
  winType: WinType;
  isMenzen: boolean;
}>;

export type HandDecomposition =
  | RegularDecomposition
  | ChiitoitsuDecomposition
  | KokushiDecomposition;

export type Hand = Readonly<{
  tiles: readonly Tile[]; // pure hand tiles (including win tile, total 14 - 3*melds)
  melds: readonly Meld[];
  winTile: Tile;
  winType: WinType;
}>;

function determineShuntsuWaitType(
  sortedTiles: readonly Tile[],
  winTile: Tile
): "ryanmen" | "kanchan" | "penchan" {
  const v1 = sortedTiles[0].value;
  const v2 = sortedTiles[1].value;
  const v3 = sortedTiles[2].value;

  if (Tile.equals(winTile, sortedTiles[1])) {
    return "kanchan";
  }
  if (Tile.equals(winTile, sortedTiles[0])) {
    return v1 === 7 && v2 === 8 && v3 === 9 ? "penchan" : "ryanmen";
  }
  if (Tile.equals(winTile, sortedTiles[2])) {
    return v1 === 1 && v2 === 2 && v3 === 3 ? "penchan" : "ryanmen";
  }
  return "ryanmen";
}

export const Hand = {
  create(
    handTileStrings: readonly string[],
    meldsInput: readonly MeldInput[],
    winTileString: string,
    winType: WinType
  ): Hand {
    const rawTiles = [...handTileStrings];
    const totalTiles = rawTiles.length + meldsInput.length * 3;

    if (totalTiles === 13) {
      rawTiles.push(winTileString);
    }

    const tiles = Tile.sort(rawTiles.map((t) => Tile.parse(t)));
    const melds = meldsInput.map((m) => Meld.fromInput(m));
    const winTile = Tile.parse(winTileString);

    return {
      tiles,
      melds,
      winTile,
      winType,
    };
  },

  isMenzen(hand: Hand): boolean {
    return hand.melds.every((m) => m.type === "ankan");
  },

  decompose(hand: Hand): readonly HandDecomposition[] {
    const results: HandDecomposition[] = [];
    const isMenzen = Hand.isMenzen(hand);

    if (isMenzen && hand.melds.length === 0 && hand.tiles.length === 14) {
      const kokushi = Hand.decomposeKokushi(hand);
      if (kokushi) {
        results.push(kokushi);
      }
    }

    if (isMenzen && hand.melds.length === 0 && hand.tiles.length === 14) {
      const chiitoitsu = Hand.decomposeChiitoitsu(hand);
      if (chiitoitsu) {
        results.push(chiitoitsu);
      }
    }

    const regularResults = Hand.decomposeRegular(hand);
    results.push(...regularResults);

    return results;
  },

  decomposeKokushi(hand: Hand): KokushiDecomposition | null {
    const terminalHonorTiles = hand.tiles.filter(Tile.isTerminalOrHonor);
    if (terminalHonorTiles.length !== 14) {
      return null;
    }

    const uniqueMap = new Map<string, Tile>();
    for (const t of terminalHonorTiles) {
      const key = `${t.suit}${t.value}`;
      uniqueMap.set(key, t);
    }

    if (uniqueMap.size !== 13) {
      return null;
    }

    const counts = new Map<string, number>();
    let pairTile: Tile | null = null;
    for (const t of terminalHonorTiles) {
      const key = `${t.suit}${t.value}`;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      if (count === 2) {
        pairTile = t;
      }
    }

    if (!pairTile) return null;

    const tempTiles = [...hand.tiles];
    const winIndex = tempTiles.findIndex((t) => Tile.equals(t, hand.winTile));
    if (winIndex >= 0) {
      tempTiles.splice(winIndex, 1);
    }
    const pureHandUnique = new Set(tempTiles.map((t) => `${t.suit}${t.value}`));
    const isThirteenWait = pureHandUnique.size === 13;

    return {
      shape: "kokushi",
      tiles: hand.tiles,
      pairTile,
      isThirteenWait,
      winTile: hand.winTile,
      winType: hand.winType,
      isMenzen: true,
    };
  },

  decomposeChiitoitsu(hand: Hand): ChiitoitsuDecomposition | null {
    if (hand.tiles.length !== 14) return null;

    const counts = new Map<string, { tile: Tile; count: number }>();
    for (const t of hand.tiles) {
      const key = `${t.suit}${t.value}`;
      const curr = counts.get(key);
      if (curr) {
        curr.count += 1;
      } else {
        counts.set(key, { tile: t, count: 1 });
      }
    }

    if (counts.size !== 7) return null;

    const pairs: Tile[] = [];
    for (const entry of counts.values()) {
      if (entry.count !== 2) return null;
      pairs.push(entry.tile);
    }

    return {
      shape: "chiitoitsu",
      pairs: Tile.sort(pairs),
      winTile: hand.winTile,
      winType: hand.winType,
      isMenzen: true,
    };
  },

  decomposeRegular(hand: Hand): readonly RegularDecomposition[] {
    const openSets: HandSet[] = hand.melds.map((m) => {
      let type: MeldSetType = "shuntsu";
      if (m.type === "chi") type = "shuntsu";
      else if (m.type === "pon") type = "koutsu";
      else if (m.type === "kan" || m.type === "ankan") type = "kantsu";

      return {
        type,
        tiles: m.tiles,
        isConcealed: m.type === "ankan",
        containsWinTile: false,
      };
    });

    const results: RegularDecomposition[] = [];
    const isMenzen = Hand.isMenzen(hand);

    const search = (
      remainingTiles: readonly Tile[],
      accSets: readonly HandSet[],
      accPair: HandPair | null
    ) => {
      if (remainingTiles.length === 0) {
        if (accSets.length === 4 && accPair) {
          const validated = Hand.assignWinTileAndWaits(
            accSets,
            accPair,
            hand.winTile,
            hand.winType,
            isMenzen
          );
          if (validated) {
            results.push(validated);
          }
        }
        return;
      }

      if (!accPair) {
        const uniqueTiles = Hand.getUniqueTiles(remainingTiles);
        for (const uTile of uniqueTiles) {
          const count = remainingTiles.filter((t) => Tile.equals(t, uTile)).length;
          if (count >= 2) {
            const nextTiles = Hand.removeTiles(remainingTiles, [uTile, uTile]);
            const pair: HandPair = {
              tile: uTile,
              containsWinTile: false,
              isTankiWait: false,
            };
            search(nextTiles, accSets, pair);
          }
        }
      }

      if (accSets.length < 4) {
        const firstTile = remainingTiles[0];
        if (firstTile.suit !== "z") {
          const t1 = firstTile;
          const t2Tile = { suit: t1.suit, value: t1.value + 1, isRed: false };
          const t3Tile = { suit: t1.suit, value: t1.value + 2, isRed: false };

          const hasT2 = remainingTiles.some((t) => Tile.equals(t, t2Tile));
          const hasT3 = remainingTiles.some((t) => Tile.equals(t, t3Tile));

          if (hasT2 && hasT3) {
            const actualT2 = remainingTiles.find((t) => Tile.equals(t, t2Tile))!;
            const actualT3 = remainingTiles.find((t) => Tile.equals(t, t3Tile))!;

            const nextTiles = Hand.removeTiles(remainingTiles, [t1, actualT2, actualT3]);
            const newSet: HandSet = {
              type: "shuntsu",
              tiles: [t1, actualT2, actualT3],
              isConcealed: true,
              containsWinTile: false,
            };
            search(nextTiles, [...accSets, newSet], accPair);
          }
        }

        const firstTileForKoutsu = remainingTiles[0];
        const count = remainingTiles.filter((t) => Tile.equals(t, firstTileForKoutsu)).length;
        if (count >= 3) {
          const koutsuTiles = remainingTiles
            .filter((t) => Tile.equals(t, firstTileForKoutsu))
            .slice(0, 3);
          const nextTiles = Hand.removeTiles(remainingTiles, koutsuTiles);
          const newSet: HandSet = {
            type: "koutsu",
            tiles: koutsuTiles,
            isConcealed: true,
            containsWinTile: false,
          };
          search(nextTiles, [...accSets, newSet], accPair);
        }
      }
    };

    search(hand.tiles, openSets, null);

    return Hand.deduplicateDecompositions(results);
  },

  assignWinTileAndWaits(
    sets: readonly HandSet[],
    pair: HandPair,
    winTile: Tile,
    winType: WinType,
    isMenzen: boolean
  ): RegularDecomposition | null {
    const possibilities: RegularDecomposition[] = [];

    if (Tile.equals(pair.tile, winTile)) {
      const updatedPair: HandPair = {
        tile: pair.tile,
        containsWinTile: true,
        isTankiWait: true,
      };
      possibilities.push({
        shape: "regular",
        pair: updatedPair,
        sets,
        winTile,
        winType,
        isMenzen,
      });
    }

    sets.forEach((set, idx) => {
      if (!set.isConcealed) return;

      const tileMatchIndex = set.tiles.findIndex((t) => Tile.equals(t, winTile));
      if (tileMatchIndex >= 0) {
        let waitType: "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki" = "ryanmen";
        let isSetConcealed = true;

        if (set.type === "koutsu") {
          waitType = "shanpon";
          if (winType === "ron") {
            isSetConcealed = false;
          }
        } else if (set.type === "shuntsu") {
          const sortedTiles = Tile.sort(set.tiles);
          waitType = determineShuntsuWaitType(sortedTiles, winTile);
        }

        const updatedSet: HandSet = {
          ...set,
          isConcealed: isSetConcealed,
          containsWinTile: true,
          waitType,
        };

        const updatedSets = sets.map((s, i) => (i === idx ? updatedSet : s));
        possibilities.push({
          shape: "regular",
          pair,
          sets: updatedSets,
          winTile,
          winType,
          isMenzen,
        });
      }
    });

    if (possibilities.length === 0) return null;
    return possibilities[0];
  },

  getUniqueTiles(tiles: readonly Tile[]): readonly Tile[] {
    const result: Tile[] = [];
    for (const t of tiles) {
      if (!result.some((r) => Tile.equals(r, t))) {
        result.push(t);
      }
    }
    return result;
  },

  removeTiles(source: readonly Tile[], toRemove: readonly Tile[]): readonly Tile[] {
    const result = [...source];
    for (const rem of toRemove) {
      const idx = result.findIndex((t) => Tile.equals(t, rem));
      if (idx >= 0) {
        result.splice(idx, 1);
      }
    }
    return result;
  },

  deduplicateDecompositions(
    decompositions: readonly RegularDecomposition[]
  ): readonly RegularDecomposition[] {
    const unique: RegularDecomposition[] = [];
    const keys = new Set<string>();

    for (const d of decompositions) {
      const pairKey = `${d.pair.tile.suit}${d.pair.tile.value}_win:${d.pair.containsWinTile}`;
      const setsKey = d.sets
        .map(
          (s) =>
            `${s.type}_${s.tiles.map((t) => `${t.suit}${t.value}`).join("")}_c:${s.isConcealed}_win:${s.containsWinTile}_w:${s.waitType}`
        )
        .sort()
        .join("|");
      const fullKey = `${pairKey}#${setsKey}`;

      if (!keys.has(fullKey)) {
        keys.add(fullKey);
        unique.push(d);
      }
    }

    return unique;
  },

  calculateShanten(tiles: readonly Tile[], melds: readonly Meld[]): number {
    const count14 = tiles.length + melds.length * 3;
    const targetMentsu = 4 - melds.length;

    const regularShanten = Hand.calculateRegularShanten(tiles, targetMentsu);

    let chiitoitsuShanten = 99;
    if (melds.length === 0 && count14 >= 13) {
      chiitoitsuShanten = Hand.calculateChiitoitsuShanten(tiles);
    }

    let kokushiShanten = 99;
    if (melds.length === 0 && count14 >= 13) {
      kokushiShanten = Hand.calculateKokushiShanten(tiles);
    }

    return Math.min(regularShanten, chiitoitsuShanten, kokushiShanten);
  },

  calculateRegularShanten(tiles: readonly Tile[], targetMentsu: number): number {
    let minShanten = 8;

    const tileCounts = new Map<string, number>();
    for (const t of tiles) {
      const key = `${t.suit}${t.value}`;
      tileCounts.set(key, (tileCounts.get(key) ?? 0) + 1);
    }

    const suits: ("m" | "p" | "s" | "z")[] = ["m", "p", "s", "z"];

    const searchShanten = (
      suitIdx: number,
      val: number,
      mentsu: number,
      taatsu: number,
      hasPair: boolean,
      counts: Map<string, number>
    ) => {
      const currentTaatsu = Math.min(taatsu, targetMentsu - mentsu);
      const currentShanten = 2 * (targetMentsu - mentsu) - currentTaatsu - (hasPair ? 1 : 0);
      if (currentShanten < minShanten) {
        minShanten = currentShanten;
      }

      if (mentsu === targetMentsu) return;
      if (suitIdx >= suits.length) return;

      const suit = suits[suitIdx];
      const maxVal = suit === "z" ? 7 : 9;

      if (val > maxVal) {
        searchShanten(suitIdx + 1, 1, mentsu, taatsu, hasPair, counts);
        return;
      }

      const key = `${suit}${val}`;
      const count = counts.get(key) ?? 0;

      if (count === 0) {
        searchShanten(suitIdx, val + 1, mentsu, taatsu, hasPair, counts);
        return;
      }

      if (count >= 3) {
        counts.set(key, count - 3);
        searchShanten(suitIdx, val, mentsu + 1, taatsu, hasPair, counts);
        counts.set(key, count);
      }

      if (!hasPair && count >= 2) {
        counts.set(key, count - 2);
        searchShanten(suitIdx, val, mentsu, taatsu, true, counts);
        counts.set(key, count);
      }

      if (suit !== "z" && val <= 7) {
        const k2 = `${suit}${val + 1}`;
        const k3 = `${suit}${val + 2}`;
        const c2 = counts.get(k2) ?? 0;
        const c3 = counts.get(k3) ?? 0;

        if (c2 >= 1 && c3 >= 1) {
          counts.set(key, count - 1);
          counts.set(k2, c2 - 1);
          counts.set(k3, c3 - 1);

          searchShanten(suitIdx, val, mentsu + 1, taatsu, hasPair, counts);

          counts.set(key, count);
          counts.set(k2, c2);
          counts.set(k3, c3);
        }
      }

      if (count >= 2) {
        counts.set(key, count - 2);
        searchShanten(suitIdx, val, mentsu, taatsu + 1, hasPair, counts);
        counts.set(key, count);
      }

      if (suit !== "z" && val <= 8) {
        const k2 = `${suit}${val + 1}`;
        const c2 = counts.get(k2) ?? 0;
        if (c2 >= 1) {
          counts.set(key, count - 1);
          counts.set(k2, c2 - 1);
          searchShanten(suitIdx, val, mentsu, taatsu + 1, hasPair, counts);
          counts.set(key, count);
          counts.set(k2, c2);
        }
      }

      if (suit !== "z" && val <= 7) {
        const k3 = `${suit}${val + 2}`;
        const c3 = counts.get(k3) ?? 0;
        if (c3 >= 1) {
          counts.set(key, count - 1);
          counts.set(k3, c3 - 1);
          searchShanten(suitIdx, val, mentsu, taatsu + 1, hasPair, counts);
          counts.set(key, count);
          counts.set(k3, c3);
        }
      }

      searchShanten(suitIdx, val + 1, mentsu, taatsu, hasPair, counts);
    };

    searchShanten(0, 1, 0, 0, false, tileCounts);
    return minShanten;
  },

  calculateChiitoitsuShanten(tiles: readonly Tile[]): number {
    const counts = new Map<string, number>();
    for (const t of tiles) {
      const key = `${t.suit}${t.value}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    let pairs = 0;
    const uniqueTypes = counts.size;
    for (const count of counts.values()) {
      if (count >= 2) {
        pairs += 1;
      }
    }

    let shanten = 6 - pairs;
    if (uniqueTypes < 7) {
      shanten += 7 - uniqueTypes;
    }
    return shanten;
  },

  calculateKokushiShanten(tiles: readonly Tile[]): number {
    const uniqueTerminals = new Set<string>();
    let hasPair = false;

    const counts = new Map<string, number>();
    for (const t of tiles) {
      if (Tile.isTerminalOrHonor(t)) {
        const key = `${t.suit}${t.value}`;
        uniqueTerminals.add(key);
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        if (count >= 2) {
          hasPair = true;
        }
      }
    }

    return 13 - uniqueTerminals.size - (hasPair ? 1 : 0);
  },
} as const;
