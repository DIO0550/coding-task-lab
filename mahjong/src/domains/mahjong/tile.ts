export type TileSuit = "m" | "p" | "s" | "z";

export type Tile = Readonly<{
  suit: TileSuit;
  value: number; // 1-9 for m/p/s, 1-7 for z (1: ton, 2: nan, 3: sha, 4: pei, 5: haku, 6: hatsu, 7: chun)
  isRed: boolean;
}>;

const honorNames = ["", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] as const;

export const Tile = {
  fromString(str: string): Tile {
    const trimmed = str.trim();
    if (trimmed === "0m") return { suit: "m", value: 5, isRed: true };
    if (trimmed === "0p") return { suit: "p", value: 5, isRed: true };
    if (trimmed === "0s") return { suit: "s", value: 5, isRed: true };

    const match = trimmed.match(/^([1-9])([mps])$/);
    if (match) {
      return {
        suit: match[2] as TileSuit,
        value: parseInt(match[1], 10),
        isRed: false,
      };
    }

    const honorsIndex = honorNames.indexOf(trimmed as typeof honorNames[number]);
    if (honorsIndex > 0) {
      return {
        suit: "z",
        value: honorsIndex,
        isRed: false,
      };
    }

    throw new Error(`Invalid tile string: ${str}`);
  },

  toString(tile: Tile): string {
    if (tile.isRed) return `0${tile.suit}`;
    if (tile.suit === "z") {
      return honorNames[tile.value] || "";
    }
    return `${tile.value}${tile.suit}`;
  },

  equals(a: Tile, b: Tile): boolean {
    return a.suit === b.suit && a.value === b.value;
  },

  equalsExact(a: Tile, b: Tile): boolean {
    return a.suit === b.suit && a.value === b.value && a.isRed === b.isRed;
  },

  compare(a: Tile, b: Tile): number {
    const suitOrder: Record<TileSuit, number> = { m: 1, p: 2, s: 3, z: 4 };
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
  },

  isTerminalOrHonor(tile: Tile): boolean {
    if (tile.suit === "z") return true;
    return tile.value === 1 || tile.value === 9;
  },

  isHonor(tile: Tile): boolean {
    return tile.suit === "z";
  },

  isTerminal(tile: Tile): boolean {
    return tile.suit !== "z" && (tile.value === 1 || tile.value === 9);
  },

  isSimple(tile: Tile): boolean {
    return tile.suit !== "z" && tile.value >= 2 && tile.value <= 8;
  }
} as const;
