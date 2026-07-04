export type Suit = "m" | "p" | "s";
export type Honor = "ton" | "nan" | "sha" | "pei" | "haku" | "hatsu" | "chun";
export type Tile =
  | "0m"
  | "1m"
  | "2m"
  | "3m"
  | "4m"
  | "5m"
  | "6m"
  | "7m"
  | "8m"
  | "9m"
  | "0p"
  | "1p"
  | "2p"
  | "3p"
  | "4p"
  | "5p"
  | "6p"
  | "7p"
  | "8p"
  | "9p"
  | "0s"
  | "1s"
  | "2s"
  | "3s"
  | "4s"
  | "5s"
  | "6s"
  | "7s"
  | "8s"
  | "9s"
  | Honor;

export type Wind = "ton" | "nan" | "sha" | "pei";
export type MeldType = "chi" | "pon" | "kan" | "ankan";
export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
}>;

export type BlockType = "sequence" | "triplet" | "kan" | "pair";
export type Block = Readonly<{
  type: BlockType;
  tile: Tile;
  tiles: readonly Tile[];
  open: boolean;
}>;

export type HandDivisionKind = "standard" | "chiitoitsu" | "kokushi";
export type HandDivision = Readonly<{
  kind: HandDivisionKind;
  blocks: readonly Block[];
}>;

export const tileTypes = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "6p",
  "7p",
  "8p",
  "9p",
  "1s",
  "2s",
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "9s",
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
] as const satisfies readonly Tile[];

export type TileType = (typeof tileTypes)[number];

const tileIndex = new Map<TileType, number>(
  tileTypes.map((tile, index) => [tile, index]),
);

const terminalAndHonorTiles = [
  "1m",
  "9m",
  "1p",
  "9p",
  "1s",
  "9s",
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
] as const satisfies readonly TileType[];

const greenTiles = ["2s", "3s", "4s", "6s", "8s", "hatsu"] as const satisfies readonly TileType[];

const isNumberedTile = (tile: TileType): boolean => /^[1-9][mps]$/.test(tile);

export const Tile = {
  parse(value: string): Tile | undefined {
    return this.isTile(value) ? value : undefined;
  },

  isTile(value: string): value is Tile {
    return (
      /^[1-9][mps]$/.test(value) ||
      /^0[mps]$/.test(value) ||
      (["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] as readonly string[]).includes(value)
    );
  },

  normalize(tile: Tile): TileType {
    if (tile === "0m") {
      return "5m";
    }
    if (tile === "0p") {
      return "5p";
    }
    if (tile === "0s") {
      return "5s";
    }
    return tile as TileType;
  },

  indexOf(tile: Tile): number {
    return tileIndex.get(this.normalize(tile)) ?? -1;
  },

  fromIndex(index: number): TileType {
    return tileTypes[index] ?? "1m";
  },

  compare(a: Tile, b: Tile): number {
    return this.indexOf(a) - this.indexOf(b);
  },

  suit(tile: Tile): Suit | undefined {
    const normalized = this.normalize(tile);
    return isNumberedTile(normalized) ? (normalized[1] as Suit) : undefined;
  },

  number(tile: Tile): number | undefined {
    const normalized = this.normalize(tile);
    return isNumberedTile(normalized) ? Number(normalized[0]) : undefined;
  },

  isHonor(tile: Tile): boolean {
    return this.indexOf(tile) >= 27;
  },

  isTerminal(tile: Tile): boolean {
    const number = this.number(tile);
    return number === 1 || number === 9;
  },

  isYaochu(tile: Tile): boolean {
    return this.isHonor(tile) || this.isTerminal(tile);
  },

  isDragon(tile: Tile): boolean {
    return ["haku", "hatsu", "chun"].includes(this.normalize(tile));
  },

  isWind(tile: Tile): tile is Wind {
    return ["ton", "nan", "sha", "pei"].includes(this.normalize(tile));
  },

  isGreen(tile: Tile): boolean {
    return (greenTiles as readonly string[]).includes(this.normalize(tile));
  },

  nextDora(tile: Tile): TileType {
    const normalized = this.normalize(tile);
    if (normalized === "9m") return "1m";
    if (normalized === "9p") return "1p";
    if (normalized === "9s") return "1s";
    if (normalized === "pei") return "ton";
    if (normalized === "chun") return "haku";
    if (normalized === "haku") return "hatsu";
    if (normalized === "hatsu") return "chun";
    const number = this.number(normalized);
    const suit = this.suit(normalized);
    return number !== undefined && suit !== undefined ? (`${number + 1}${suit}` as TileType) : "1m";
  },
} as const;

export const Hand = {
  counts(tiles: readonly Tile[]): readonly number[] {
    return tileTypes.map((tile) => tiles.filter((candidate) => Tile.normalize(candidate) === tile).length);
  },

  redCount(tiles: readonly Tile[]): number {
    return tiles.filter((tile) => tile === "0m" || tile === "0p" || tile === "0s").length;
  },

  sort(tiles: readonly Tile[]): readonly Tile[] {
    return [...tiles].sort((a, b) => Tile.compare(a, b));
  },

  isClosed(melds: readonly Meld[]): boolean {
    return melds.every((meld) => meld.type === "ankan");
  },

  findDivisions(hand: readonly Tile[], melds: readonly Meld[]): readonly HandDivision[] {
    const concealedBlocks = this.findConcealedDivisions(hand);
    const meldBlocks = melds.map(toBlock);
    return concealedBlocks
      .filter((division) => division.kind !== "standard" || division.blocks.length + meldBlocks.length === 5)
      .map((division) => ({
        kind: division.kind,
        blocks: division.kind === "standard" ? [...division.blocks, ...meldBlocks] : division.blocks,
      }));
  },

  isWinning(hand: readonly Tile[], melds: readonly Meld[]): boolean {
    return this.findDivisions(hand, melds).length > 0;
  },

  isTenpai(hand: readonly Tile[], melds: readonly Meld[]): boolean {
    if (hand.length % 3 !== 1) {
      return false;
    }
    return tileTypes.some((tile) => this.isWinning([...hand, tile], melds));
  },

  allWall(redDora: boolean): readonly Tile[] {
    return tileTypes.flatMap((tile) => {
      if (redDora && tile === "5m") return ["0m", "5m", "5m", "5m"] as const;
      if (redDora && tile === "5p") return ["0p", "5p", "5p", "5p"] as const;
      if (redDora && tile === "5s") return ["0s", "5s", "5s", "5s"] as const;
      return [tile, tile, tile, tile] as const;
    });
  },

  shantenLikeScore(hand: readonly Tile[]): number {
    const counts = this.counts(hand);
    const pairs = counts.filter((count) => count >= 2).length;
    const triplets = counts.filter((count) => count >= 3).length;
    const sequences = [0, 9, 18].reduce((total, offset) => {
      return total + Array.from({ length: 7 }).filter((_, index) => {
        return counts[offset + index] > 0 && counts[offset + index + 1] > 0 && counts[offset + index + 2] > 0;
      }).length;
    }, 0);
    return triplets * 3 + sequences * 2 + pairs;
  },

  findConcealedDivisions(hand: readonly Tile[]): readonly HandDivision[] {
    const counts = [...this.counts(hand)];
    const divisions = [
      ...findChiitoitsu(counts),
      ...findKokushi(counts),
      ...findStandard(counts),
    ];
    return divisions;
  },
} as const;

const toBlock = (meld: Meld): Block => ({
  type: meld.type === "chi" ? "sequence" : meld.type === "pon" ? "triplet" : "kan",
  tile: Tile.normalize(meld.tiles[0] ?? "1m"),
  tiles: meld.tiles.map((tile) => Tile.normalize(tile)),
  open: meld.type !== "ankan",
});

const findChiitoitsu = (counts: readonly number[]): readonly HandDivision[] => {
  const pairs = counts
    .map((count, index) => ({ count, index }))
    .filter(({ count }) => count === 2);
  const allCountsValid = counts.every((count) => count === 0 || count === 2);
  if (pairs.length !== 7 || !allCountsValid) {
    return [];
  }
  return [
    {
      kind: "chiitoitsu",
      blocks: pairs.map(({ index }) => ({
        type: "pair",
        tile: Tile.fromIndex(index),
        tiles: [Tile.fromIndex(index), Tile.fromIndex(index)],
        open: false,
      })),
    },
  ];
};

const findKokushi = (counts: readonly number[]): readonly HandDivision[] => {
  const yaochuIndexes = terminalAndHonorTiles.map((tile) => Tile.indexOf(tile));
  const hasAll = yaochuIndexes.every((index) => counts[index] >= 1);
  const hasPair = yaochuIndexes.some((index) => counts[index] >= 2);
  const noOther = counts.every((count, index) => count === 0 || yaochuIndexes.includes(index));
  if (!hasAll || !hasPair || !noOther) {
    return [];
  }
  return [
    {
      kind: "kokushi",
      blocks: terminalAndHonorTiles.map((tile) => ({
        type: "pair",
        tile,
        tiles: [tile],
        open: false,
      })),
    },
  ];
};

const findStandard = (counts: readonly number[]): readonly HandDivision[] => {
  const pairCandidates = counts
    .map((count, index) => ({ count, index }))
    .filter(({ count }) => count >= 2);

  return pairCandidates.flatMap(({ index }) => {
    const nextCounts = counts.map((count, currentIndex) => (currentIndex === index ? count - 2 : count));
    return removeSets(nextCounts).map((blocks) => ({
      kind: "standard" as const,
      blocks: [
        {
          type: "pair" as const,
          tile: Tile.fromIndex(index),
          tiles: [Tile.fromIndex(index), Tile.fromIndex(index)],
          open: false,
        },
        ...blocks,
      ],
    }));
  });
};

const removeSets = (counts: readonly number[]): readonly (readonly Block[])[] => {
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) {
    return [[]];
  }

  const tripletResults =
    counts[first] >= 3
      ? removeSets(counts.map((count, index) => (index === first ? count - 3 : count))).map((blocks) => [
          {
            type: "triplet" as const,
            tile: Tile.fromIndex(first),
            tiles: [Tile.fromIndex(first), Tile.fromIndex(first), Tile.fromIndex(first)],
            open: false,
          },
          ...blocks,
        ])
      : [];

  const canSequence = first < 27 && first % 9 <= 6 && counts[first + 1] > 0 && counts[first + 2] > 0;
  const sequenceResults = canSequence
    ? removeSets(
        counts.map((count, index) =>
          index === first || index === first + 1 || index === first + 2 ? count - 1 : count,
        ),
      ).map((blocks) => [
        {
          type: "sequence" as const,
          tile: Tile.fromIndex(first),
          tiles: [Tile.fromIndex(first), Tile.fromIndex(first + 1), Tile.fromIndex(first + 2)],
          open: false,
        },
        ...blocks,
      ])
    : [];

  return [...tripletResults, ...sequenceResults];
};
