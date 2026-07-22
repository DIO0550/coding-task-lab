export type Suit = "m" | "p" | "s" | "z";

export type Tile = Readonly<{
  suit: Suit;
  value: number; // 1-9 for m/p/s, 1-7 for z (1:ton, 2:nan, 3:sha, 4:pei, 5:haku, 6:hatsu, 7:chun)
  isRed: boolean;
}>;

const HONOR_MAP: Readonly<Record<string, number>> = {
  ton: 1,
  nan: 2,
  sha: 3,
  pei: 4,
  haku: 5,
  hatsu: 6,
  chun: 7,
};

const REVERSE_HONOR_MAP: Readonly<Record<number, string>> = {
  1: "ton",
  2: "nan",
  3: "sha",
  4: "pei",
  5: "haku",
  6: "hatsu",
  7: "chun",
};

export const Tile = {
  parse(str: string): Tile {
    const trimmed = str.trim();
    if (HONOR_MAP[trimmed] !== undefined) {
      return { suit: "z", value: HONOR_MAP[trimmed], isRed: false };
    }

    if (trimmed.length === 2) {
      const char0 = trimmed.charAt(0);
      const suitChar = trimmed.charAt(1) as Suit;
      if (["m", "p", "s"].includes(suitChar)) {
        if (char0 === "0") {
          return { suit: suitChar, value: 5, isRed: true };
        }
        const val = Number.parseInt(char0, 10);
        if (val >= 1 && val <= 9) {
          return { suit: suitChar, value: val, isRed: false };
        }
      }
    }

    throw new Error(`Invalid tile string: ${str}`);
  },

  toString(tile: Tile): string {
    if (tile.suit === "z") {
      return REVERSE_HONOR_MAP[tile.value] ?? "";
    }
    if (tile.isRed) {
      return `0${tile.suit}`;
    }
    return `${tile.value}${tile.suit}`;
  },

  equals(a: Tile, b: Tile): boolean {
    return a.suit === b.suit && a.value === b.value;
  },

  exactEquals(a: Tile, b: Tile): boolean {
    return a.suit === b.suit && a.value === b.value && a.isRed === b.isRed;
  },

  isHonor(tile: Tile): boolean {
    return tile.suit === "z";
  },

  isTerminal(tile: Tile): boolean {
    return tile.suit !== "z" && (tile.value === 1 || tile.value === 9);
  },

  isTerminalOrHonor(tile: Tile): boolean {
    return Tile.isHonor(tile) || Tile.isTerminal(tile);
  },

  isSimple(tile: Tile): boolean {
    return tile.suit !== "z" && tile.value >= 2 && tile.value <= 8;
  },

  isGreen(tile: Tile): boolean {
    if (tile.suit === "s") {
      return [2, 3, 4, 6, 8].includes(tile.value);
    }
    if (tile.suit === "z") {
      return tile.value === 6; // hatsu
    }
    return false;
  },

  sort(tiles: readonly Tile[]): readonly Tile[] {
    const suitOrder: Record<Suit, number> = { m: 1, p: 2, s: 3, z: 4 };
    return [...tiles].sort((a, b) => {
      if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      if (a.value !== b.value) {
        return a.value - b.value;
      }
      if (a.isRed !== b.isRed) {
        return a.isRed ? -1 : 1;
      }
      return 0;
    });
  },

  compareTo(a: Tile, b: Tile): number {
    const suitOrder: Record<Suit, number> = { m: 1, p: 2, s: 3, z: 4 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  },
} as const;
