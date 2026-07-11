import { Tile } from "./tile";

export type MeldType = "chi" | "pon" | "kan" | "ankan";

export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
}>;

export const Meld = {
  create(type: MeldType, tiles: readonly Tile[]): Meld {
    return { type, tiles };
  },
  isOpen(meld: Meld): boolean {
    return meld.type !== "ankan";
  },
  toString(meld: Meld): string {
    const tilesStr = [...meld.tiles]
      .sort(Tile.compare)
      .map(Tile.toString)
      .join(",");
    return `${meld.type}[${tilesStr}]`;
  }
} as const;

export type NormalPartition = Readonly<{
  type: "normal";
  pair: readonly Tile[]; // exactly 2 tiles
  closedMelds: readonly Meld[];
  openMelds: readonly Meld[];
  // Win info assigned later
  completedComponent: { type: "pair" | "meld"; index: number }; // index is -1 for pair, or index in closedMelds
  machi: "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";
}>;

export type ChiitoitsuPartition = Readonly<{
  type: "chiitoitsu";
  pairs: readonly (readonly Tile[])[]; // 7 pairs
  machi: "tanki";
}>;

export type KokushiPartition = Readonly<{
  type: "kokushi";
  tiles: readonly Tile[]; // 14 tiles
  machi: "tanki" | "kokushi13";
}>;

export type HandPartition = NormalPartition | ChiitoitsuPartition | KokushiPartition;

// Helper to remove one tile matching suit and value
function removeOne(tiles: readonly Tile[], target: { suit: string; value: number }): { remaining: Tile[]; removed: Tile } | null {
  const index = tiles.findIndex(t => t.suit === target.suit && t.value === target.value);
  if (index === -1) return null;
  const remaining = [...tiles];
  const [removed] = remaining.splice(index, 1);
  return { remaining, removed };
}

// Recursive meld searcher
function findMelds(tiles: readonly Tile[], k: number): readonly (readonly Meld[])[] {
  if (k === 0) {
    return tiles.length === 0 ? [[]] : [];
  }
  if (tiles.length === 0) {
    return [];
  }

  // Since tiles are sorted, process the first one
  const first = tiles[0];
  const remainingAfterFirst = tiles.slice(1);
  const results: (readonly Meld[])[] = [];

  // 1. Try to form a Koutsu (triplet)
  const remove1 = removeOne(remainingAfterFirst, { suit: first.suit, value: first.value });
  if (remove1) {
    const remove2 = removeOne(remove1.remaining, { suit: first.suit, value: first.value });
    if (remove2) {
      const triplet = Meld.create("pon", [first, remove1.removed, remove2.removed]);
      const subResults = findMelds(remove2.remaining, k - 1);
      for (const sub of subResults) {
        results.push([triplet, ...sub]);
      }
    }
  }

  // 2. Try to form a Shuntsu (run)
  if (first.suit !== "z" && first.value <= 7) {
    const removeNext1 = removeOne(remainingAfterFirst, { suit: first.suit, value: first.value + 1 });
    if (removeNext1) {
      const removeNext2 = removeOne(removeNext1.remaining, { suit: first.suit, value: first.value + 2 });
      if (removeNext2) {
        const run = Meld.create("chi", [first, removeNext1.removed, removeNext2.removed]);
        const subResults = findMelds(removeNext2.remaining, k - 1);
        for (const sub of subResults) {
          results.push([run, ...sub]);
        }
      }
    }
  }

  return results;
}

export const Hand = {
  // Generate all possible partitions of the hand (normal, Seven Pairs, Thirteen Orphans)
  // that contain the winning tile, mapping the winning tile to a completed component.
  getPartitions(handTiles: readonly Tile[], openMelds: readonly Meld[], winTile: Tile): readonly HandPartition[] {
    const sortedHand = [...handTiles].sort(Tile.compare);
    const results: HandPartition[] = [];

    // 1. Thirteen Orphans check
    if (openMelds.length === 0 && sortedHand.length === 14) {
      const kokushi = Hand.findKokushiPartition(sortedHand, winTile);
      if (kokushi) {
        results.push(kokushi);
      }
    }

    // 2. Seven Pairs check
    if (openMelds.length === 0 && sortedHand.length === 14) {
      const chiitoitsu = Hand.findChiitoitsuPartition(sortedHand);
      if (chiitoitsu) {
        results.push(chiitoitsu);
      }
    }

        // 3. Normal form check
    const k = 4 - openMelds.length;
    // Find all unique pair candidate values
    const uniqueValues = new Set<string>();
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (Tile.equals(sortedHand[i], sortedHand[i + 1])) {
        uniqueValues.add(`${sortedHand[i].suit},${sortedHand[i].value}`);
      }
    }

    const seenPartitions = new Set<string>();

    for (const valStr of uniqueValues) {
      const [suit, valPart] = valStr.split(",");
      const value = parseInt(valPart, 10);

      // Try this as pair
      const remaining1 = removeOne(sortedHand, { suit, value });
      if (!remaining1) continue;
      const remaining2 = removeOne(remaining1.remaining, { suit, value });
      if (!remaining2) continue;

      const pairTiles = [remaining1.removed, remaining2.removed];
      const meldSets = findMelds(remaining2.remaining, k);

      for (const closedMelds of meldSets) {
        // We have a partition! Now determine all possible ways to assign winTile.
        // There could be multiple components that match winTile (e.g. if winTile is 5m,
        // and we have a 5m in the pair and a 5m in a run).
        const assignments = Hand.assignWinTile(pairTiles, closedMelds, openMelds, winTile);
        for (const part of assignments) {
          const key = Hand.serializePartition(part);
          if (!seenPartitions.has(key)) {
            seenPartitions.add(key);
            results.push(part);
          }
        }
      }
    }

    return results;
  },

  findKokushiPartition(tiles: readonly Tile[], winTile: Tile): KokushiPartition | null {
    // Kokushi contains: 1m, 9m, 1p, 9p, 1s, 9s, ton, nan, sha, pei, haku, hatsu, chun
    const terminalsAndHonors = [
      "1m", "9m", "1p", "9p", "1s", "9s",
      "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"
    ];

    const counts: Record<string, number> = {};
    for (const t of tiles) {
      const key = Tile.toString({ ...t, isRed: false });
      counts[key] = (counts[key] || 0) + 1;
    }

    // Verify we have all 13 terminals/honors
    for (const key of terminalsAndHonors) {
      if (!counts[key] || counts[key] < 1) {
        return null;
      }
    }

    // Verify total size is 14
    if (tiles.length !== 14) return null;

    // Check wait pattern:
    // If winTile is the one with count 2, and before winning we had 13 distinct tiles,
    // then winTile completes the 13-sided wait.
    // Wait, the count of winTile key is 2.
    // If we remove the winTile, do we still have 13 distinct terminals/honors?
    // If yes, then before winning, the hand had all 13 distinct terminals/honors.
    // So the wait was 13-sided!
    const winKey = Tile.toString({ ...winTile, isRed: false });
    const isKokushi13 = counts[winKey] === 2 && Object.keys(counts).length === 13;

    return {
      type: "kokushi",
      tiles,
      machi: isKokushi13 ? "kokushi13" : "tanki"
    };
  },

  findChiitoitsuPartition(tiles: readonly Tile[]): ChiitoitsuPartition | null {
    if (tiles.length !== 14) return null;

    const counts: Record<string, Tile[]> = {};
    for (const t of tiles) {
      const key = `${t.suit}${t.value}`;
      if (!counts[key]) counts[key] = [];
      counts[key].push(t);
    }

    const pairs: (readonly Tile[])[] = [];
    for (const key in counts) {
      if (counts[key].length !== 2) {
        return null; // Must be exactly 2 of each unique tile (distinct pairs)
      }
      pairs.push(counts[key]);
    }

    if (pairs.length !== 7) return null;

    return {
      type: "chiitoitsu",
      pairs,
      machi: "tanki"
    };
  },

  // Assign winTile to all possible matching components in a normal partition
  assignWinTile(
    pair: readonly Tile[],
    closedMelds: readonly Meld[],
    openMelds: readonly Meld[],
    winTile: Tile
  ): readonly NormalPartition[] {
    const results: NormalPartition[] = [];

    // 1. Can winTile complete the pair?
    if (Tile.equals(pair[0], winTile)) {
      results.push({
        type: "normal",
        pair,
        closedMelds,
        openMelds,
        completedComponent: { type: "pair", index: -1 },
        machi: "tanki"
      });
    }

    // 2. Can winTile complete any closed meld?
    for (let i = 0; i < closedMelds.length; i++) {
      const meld = closedMelds[i];
      const hasTile = meld.tiles.some(t => Tile.equals(t, winTile));
      if (!hasTile) continue;

      let machi: NormalPartition["machi"] = "tanki";
      if (meld.type === "pon" || meld.type === "kan" || meld.type === "ankan") {
        machi = "shanpon";
      } else if (meld.type === "chi") {
        const values = [...meld.tiles].map(t => t.value).sort((a, b) => a - b);
        const winVal = winTile.value;

        if (winVal === values[1]) {
          machi = "kanchan"; // Middle tile wait
        } else if (winVal === 3 && values[0] === 1) {
          machi = "penchan"; // Edge wait 1-2-3 (waiting for 3)
        } else if (winVal === 7 && values[2] === 9) {
          machi = "penchan"; // Edge wait 7-8-9 (waiting for 7)
        } else {
          machi = "ryanmen"; // Double-sided wait
        }
      }

      results.push({
        type: "normal",
        pair,
        closedMelds,
        openMelds,
        completedComponent: { type: "meld", index: i },
        machi
      });
    }

    return results;
  },

  serializePartition(part: HandPartition): string {
    if (part.type === "kokushi") {
      return `kokushi:${part.machi}`;
    }
    if (part.type === "chiitoitsu") {
      const pairsStr = [...part.pairs]
        .map(p => `${p[0].suit}${p[0].value}`)
        .sort()
        .join(",");
      return `chiitoitsu:${pairsStr}`;
    }

    // Normal partition
    const pairStr = `${part.pair[0].suit}${part.pair[0].value}`;
    const closedStr = [...part.closedMelds]
      .map(Meld.toString)
      .sort()
      .join("|");
    const openStr = [...part.openMelds]
      .map(Meld.toString)
      .sort()
      .join("|");
    const compStr = `${part.completedComponent.type}:${part.completedComponent.index}`;
    return `normal:pair[${pairStr}]:closed[${closedStr}]:open[${openStr}]:comp[${compStr}]:machi[${part.machi}]`;
  }
} as const;
