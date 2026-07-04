import { Hand, Tile, type Block, type HandDivision, type Meld, type Tile as TileValue, type Wind } from "../../domains/mahjong/index.ts";

export type WinType = "tsumo" | "ron";
export type RiichiState = "none" | "riichi" | "double";
export type SituationalYaku = "haitei" | "houtei" | "rinshan" | "chankan" | "tenhou" | "chihou";
export type ScoreInput = Readonly<{
  hand: readonly TileValue[];
  melds: readonly Meld[];
  winTile: TileValue;
  winType: WinType;
  seatWind: Wind;
  roundWind: Extract<Wind, "ton" | "nan">;
  dora: readonly TileValue[];
  uraDora: readonly TileValue[];
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly SituationalYaku[];
  honba?: number;
  riichiSticks?: number;
}>;

export type Yaku = Readonly<{
  name: string;
  han: number;
}>;

export type Payment = Readonly<{
  from: "dealer" | "non_dealer" | "discarder" | "all";
  amount: number;
  count: number;
}>;

export type Score = Readonly<{
  total: number;
  payments: readonly Payment[];
}>;

export type ScoreResult =
  | Readonly<{
      valid: true;
      yaku: readonly Yaku[];
      han: number;
      fu: number;
      score: Score;
    }>
  | Readonly<{
      valid: false;
      reason: "no_yaku" | "not_winning_hand" | "invalid_input";
    }>;

type Candidate = Readonly<{
  division: HandDivision;
  yaku: readonly Yaku[];
  han: number;
  fu: number;
  score: Score;
}>;

const winds = ["ton", "nan", "sha", "pei"] as const;
const honors = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] as const;
const situations = ["haitei", "houtei", "rinshan", "chankan", "tenhou", "chihou"] as const;

export const ScoreCalculator = {
  calculate(input: ScoreInput): ScoreResult {
    if (!isValidInput(input)) {
      return { valid: false, reason: "invalid_input" };
    }

    const divisions = Hand.findDivisions(input.hand, input.melds);
    if (divisions.length === 0) {
      return { valid: false, reason: "not_winning_hand" };
    }

    const candidates = divisions
      .map((division) => evaluateCandidate(input, division))
      .filter((candidate): candidate is Candidate => candidate !== undefined);

    if (candidates.length === 0) {
      return { valid: false, reason: "no_yaku" };
    }

    const best = [...candidates].sort((a, b) => b.score.total - a.score.total || b.han - a.han || b.fu - a.fu)[0];
    if (best === undefined) {
      return { valid: false, reason: "no_yaku" };
    }

    return {
      valid: true,
      yaku: best.yaku,
      han: best.han,
      fu: best.fu,
      score: best.score,
    };
  },
} as const;

export const parseScoreInput = (value: unknown): ScoreInput | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const hand = parseTiles(value.hand);
  const melds = parseMelds(value.melds);
  const winTile = typeof value.winTile === "string" ? Tile.parse(value.winTile) : undefined;
  const winType = value.winType === "tsumo" || value.winType === "ron" ? value.winType : undefined;
  const seatWind = typeof value.seatWind === "string" && isWind(value.seatWind) ? value.seatWind : undefined;
  const roundWind = value.roundWind === "ton" || value.roundWind === "nan" ? value.roundWind : undefined;
  const dora = parseTiles(value.dora);
  const uraDora = parseTiles(value.uraDora);
  const riichi =
    value.riichi === "none" || value.riichi === "riichi" || value.riichi === "double" ? value.riichi : undefined;
  const ippatsu = typeof value.ippatsu === "boolean" ? value.ippatsu : undefined;
  const situational = parseSituational(value.situational);
  const honba = typeof value.honba === "number" && Number.isInteger(value.honba) && value.honba >= 0 ? value.honba : 0;
  const riichiSticks =
    typeof value.riichiSticks === "number" && Number.isInteger(value.riichiSticks) && value.riichiSticks >= 0
      ? value.riichiSticks
      : 0;

  if (
    hand === undefined ||
    melds === undefined ||
    winTile === undefined ||
    winType === undefined ||
    seatWind === undefined ||
    roundWind === undefined ||
    dora === undefined ||
    uraDora === undefined ||
    riichi === undefined ||
    ippatsu === undefined ||
    situational === undefined
  ) {
    return undefined;
  }

  return {
    hand,
    melds,
    winTile,
    winType,
    seatWind,
    roundWind,
    dora,
    uraDora,
    riichi,
    ippatsu,
    situational,
    honba,
    riichiSticks,
  };
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTiles = (value: unknown): readonly TileValue[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const parsed = value.map((item) => (typeof item === "string" ? Tile.parse(item) : undefined));
  return parsed.every((tile): tile is TileValue => tile !== undefined) ? parsed : undefined;
};

const parseMelds = (value: unknown): readonly Meld[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed = value.map((item) => {
    if (!isRecord(item)) {
      return undefined;
    }
    const type =
      item.type === "chi" || item.type === "pon" || item.type === "kan" || item.type === "ankan" ? item.type : undefined;
    const tiles = parseTiles(item.tiles);
    if (type === undefined || tiles === undefined) {
      return undefined;
    }
    return { type, tiles };
  });

  return parsed.every((meld): meld is Meld => meld !== undefined) ? parsed : undefined;
};

const parseSituational = (value: unknown): readonly SituationalYaku[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.every((item): item is SituationalYaku => typeof item === "string" && situations.includes(item as SituationalYaku))
    ? value
    : undefined;
};

const isWind = (value: string): value is Wind => winds.includes(value as Wind);

const isValidInput = (input: ScoreInput): boolean => {
  const expectedHandSize = 14 - input.melds.length * 3;
  const allTiles = [...input.hand, ...input.melds.flatMap((meld) => meld.tiles)];
  const counts = Hand.counts(allTiles);
  return (
    input.hand.length === expectedHandSize &&
    input.hand.some((tile) => Tile.normalize(tile) === Tile.normalize(input.winTile)) &&
    input.melds.every(isValidMeld) &&
    counts.every((count) => count <= 4)
  );
};

const isValidMeld = (meld: Meld): boolean => {
  if (
    (meld.type === "pon" || meld.type === "kan" || meld.type === "ankan") &&
    new Set(meld.tiles.map((tile) => Tile.normalize(tile))).size !== 1
  ) {
    return false;
  }
  if (meld.type === "pon") {
    return meld.tiles.length === 3;
  }
  if (meld.type === "kan" || meld.type === "ankan") {
    return meld.tiles.length === 4;
  }
  if (meld.type !== "chi" || meld.tiles.length !== 3) {
    return false;
  }
  const sorted = Hand.sort(meld.tiles).map((tile) => Tile.normalize(tile));
  const first = sorted[0];
  const firstNumber = first === undefined ? undefined : Tile.number(first);
  const suit = first === undefined ? undefined : Tile.suit(first);
  return (
    firstNumber !== undefined &&
    suit !== undefined &&
    sorted.every((tile) => Tile.suit(tile) === suit) &&
    sorted[1] === `${firstNumber + 1}${suit}` &&
    sorted[2] === `${firstNumber + 2}${suit}`
  );
};

const evaluateCandidate = (input: ScoreInput, division: HandDivision): Candidate | undefined => {
  const yakuman = getYakuman(input, division);
  const isDealer = input.seatWind === "ton";
  if (yakuman.length > 0) {
    const han = yakuman.reduce((total, yaku) => total + yaku.han, 0);
    const score = calculatePayments({
      han,
      fu: 0,
      winType: input.winType,
      isDealer,
      honba: input.honba ?? 0,
      riichiSticks: input.riichiSticks ?? 0,
      yakumanUnits: Math.max(1, han / 13),
    });
    return { division, yaku: yakuman, han, fu: 0, score };
  }

  const normalYaku = getNormalYaku(input, division);
  if (normalYaku.length === 0) {
    return undefined;
  }
  const yaku = [...normalYaku, ...getDoraYaku(input)];
  const han = yaku.reduce((total, item) => total + item.han, 0);
  const fu = calculateFu(input, division);
  const score = calculatePayments({
    han,
    fu,
    winType: input.winType,
    isDealer,
    honba: input.honba ?? 0,
    riichiSticks: input.riichiSticks ?? 0,
  });
  return { division, yaku: combineYaku(yaku), han, fu, score };
};

const getYakuman = (input: ScoreInput, division: HandDivision): readonly Yaku[] => {
  const allTiles = allTilesOf(input, division).map((tile) => Tile.normalize(tile));
  const blocks = division.blocks;
  const triplets = blocks.filter((block) => block.type === "triplet" || block.type === "kan");
  const yaku: Yaku[] = [];
  if (input.situational.includes("tenhou")) yaku.push({ name: "tenhou", han: 13 });
  if (input.situational.includes("chihou")) yaku.push({ name: "chihou", han: 13 });
  if (division.kind === "kokushi") yaku.push({ name: isKokushiThirteenWait(input) ? "kokushi_musou_13_men" : "kokushi_musou", han: isKokushiThirteenWait(input) ? 26 : 13 });
  if (
    division.kind === "standard" &&
    triplets.length === 4 &&
    Hand.isClosed(input.melds) &&
    (input.winType === "tsumo" || hasPairWait(input, division))
  ) {
    yaku.push({ name: hasPairWait(input, division) ? "suuankou_tanki" : "suuankou", han: hasPairWait(input, division) ? 26 : 13 });
  }
  if (triplets.filter((block) => block.tiles.some((tile) => ["haku", "hatsu", "chun"].includes(Tile.normalize(tile)))).length === 3) {
    yaku.push({ name: "daisangen", han: 13 });
  }
  const windTriplets = triplets.filter((block) => block.tiles.some((tile) => winds.includes(Tile.normalize(tile) as Wind))).length;
  const windPairs = blocks.filter((block) => block.type === "pair" && winds.includes(Tile.normalize(block.tile) as Wind)).length;
  if (windTriplets === 4) yaku.push({ name: "daisuushi", han: 26 });
  if (windTriplets === 3 && windPairs === 1) yaku.push({ name: "shousuushi", han: 13 });
  if (allTiles.every((tile) => honors.includes(tile as (typeof honors)[number]))) yaku.push({ name: "tsuuiisou", han: 13 });
  if (allTiles.every((tile) => Tile.isGreen(tile))) yaku.push({ name: "ryuuiisou", han: 13 });
  if (allTiles.every((tile) => !Tile.isHonor(tile) && Tile.isTerminal(tile))) yaku.push({ name: "chinroutou", han: 13 });
  if (blocks.filter((block) => block.type === "kan").length === 4) yaku.push({ name: "suukantsu", han: 13 });
  if (isChuuren(allTiles) && Hand.isClosed(input.melds)) yaku.push({ name: "chuuren_poutou", han: 13 });
  return yaku;
};

const getNormalYaku = (input: ScoreInput, division: HandDivision): readonly Yaku[] => {
  const closed = Hand.isClosed(input.melds);
  const blocks = division.blocks;
  const allTiles = allTilesOf(input, division).map((tile) => Tile.normalize(tile));
  const sequences = blocks.filter((block) => block.type === "sequence");
  const triplets = blocks.filter((block) => block.type === "triplet" || block.type === "kan");
  const pair = blocks.find((block) => block.type === "pair");
  const yaku: Yaku[] = [];

  if (input.riichi === "riichi") yaku.push({ name: "riichi", han: 1 });
  if (input.riichi === "double") yaku.push({ name: "double_riichi", han: 2 });
  if (input.ippatsu && input.riichi !== "none") yaku.push({ name: "ippatsu", han: 1 });
  if (closed && input.winType === "tsumo") yaku.push({ name: "menzen_tsumo", han: 1 });
  if (allTiles.every((tile) => !Tile.isYaochu(tile))) yaku.push({ name: "tanyao", han: 1 });
  if (division.kind === "standard" && sequences.length === 4 && pair !== undefined && !isValuePair(pair, input) && !hasFuWait(input, division)) {
    yaku.push({ name: "pinfu", han: 1 });
  }
  if (closed && hasIipeikou(sequences)) yaku.push({ name: "iipeikou", han: 1 });
  const yakuhaiHan = triplets.filter((block) => isValueTriplet(block, input)).length;
  if (yakuhaiHan > 0) yaku.push({ name: "yakuhai", han: yakuhaiHan });
  if (input.situational.includes("haitei")) yaku.push({ name: "haitei", han: 1 });
  if (input.situational.includes("houtei")) yaku.push({ name: "houtei", han: 1 });
  if (input.situational.includes("rinshan")) yaku.push({ name: "rinshan", han: 1 });
  if (input.situational.includes("chankan")) yaku.push({ name: "chankan", han: 1 });
  if (division.kind === "chiitoitsu") yaku.push({ name: "chiitoitsu", han: 2 });
  if (triplets.length === 4) yaku.push({ name: "toitoi", han: 2 });
  if (triplets.filter((block) => !isOpenSetForWin(input, block)).length >= 3) yaku.push({ name: "sanankou", han: 2 });
  if (triplets.filter((block) => block.type === "kan").length >= 3) yaku.push({ name: "san_kantsu", han: 2 });
  if (hasSanshokuDoukou(triplets)) yaku.push({ name: "sanshoku_doukou", han: 2 });
  if (hasSanshokuDoujun(sequences)) yaku.push({ name: "sanshoku_doujun", han: closed ? 2 : 1 });
  if (hasIttsu(sequences)) yaku.push({ name: "ittsu", han: closed ? 2 : 1 });
  if (hasChanta(blocks)) yaku.push({ name: "chanta", han: closed ? 2 : 1 });
  if (hasShousangen(blocks, triplets)) yaku.push({ name: "shousangen", han: 2 });
  if (allTiles.every((tile) => Tile.isYaochu(tile))) yaku.push({ name: "honroutou", han: 2 });
  if (closed && countSequencePairs(sequences) >= 2) yaku.push({ name: "ryanpeikou", han: 3 });
  if (hasJunchan(blocks)) yaku.push({ name: "junchan", han: closed ? 3 : 2 });
  const flush = getFlush(allTiles);
  if (flush === "honitsu") yaku.push({ name: "honitsu", han: closed ? 3 : 2 });
  if (flush === "chinitsu") yaku.push({ name: "chinitsu", han: closed ? 6 : 5 });
  return combineYaku(
    yaku.filter(
      (item) =>
        !(item.name === "iipeikou" && yaku.some((other) => other.name === "ryanpeikou")) &&
        !(item.name === "chanta" && yaku.some((other) => other.name === "junchan")),
    ),
  );
};

const getDoraYaku = (input: ScoreInput): readonly Yaku[] => {
  const handTiles = [...input.hand, ...input.melds.flatMap((meld) => meld.tiles)];
  const tiles = handTiles.map((tile) => Tile.normalize(tile));
  const dora = countDora(tiles, input.dora);
  const uraDora = input.riichi === "none" ? 0 : countDora(tiles, input.uraDora);
  const akaDora = Hand.redCount(handTiles);
  const total = dora + uraDora + akaDora;
  return total > 0 ? [{ name: "dora", han: total }] : [];
};

const countDora = (tiles: readonly TileValue[], dora: readonly TileValue[]): number =>
  dora.reduce((total, doraTile) => {
    const normalized = Tile.normalize(doraTile);
    return total + tiles.filter((tile) => Tile.normalize(tile) === normalized).length;
  }, 0);

const combineYaku = (yaku: readonly Yaku[]): readonly Yaku[] => {
  return yaku.reduce<readonly Yaku[]>((items, item) => {
    const existing = items.find((candidate) => candidate.name === item.name);
    if (existing === undefined) {
      return [...items, item];
    }
    return items.map((candidate) =>
      candidate.name === item.name ? { name: candidate.name, han: candidate.han + item.han } : candidate,
    );
  }, []);
};

const calculateFu = (input: ScoreInput, division: HandDivision): number => {
  if (division.kind === "chiitoitsu") {
    return 25;
  }
  if (
    division.kind === "standard" &&
    input.winType === "tsumo" &&
    division.blocks.filter((block) => block.type === "sequence").length === 4 &&
    !division.blocks.some((block) => block.type === "pair" && isValuePair(block, input)) &&
    !hasFuWait(input, division)
  ) {
    return 20;
  }

  const base = 20;
  const closedRon = input.winType === "ron" && Hand.isClosed(input.melds) ? 10 : 0;
  const tsumo = input.winType === "tsumo" ? 2 : 0;
  const pairFu = division.blocks
    .filter((block) => block.type === "pair")
    .reduce((total, block) => total + pairFuOf(block, input), 0);
  const setFu = division.blocks
    .filter((block) => block.type === "triplet" || block.type === "kan")
    .reduce((total, block) => total + setFuOf(block, input), 0);
  const waitFu = hasFuWait(input, division) ? 2 : 0;
  return Math.max(30, roundUpFu(base + closedRon + tsumo + pairFu + setFu + waitFu));
};

const pairFuOf = (block: Block, input: ScoreInput): number => {
  const tile = Tile.normalize(block.tile);
  const dragon = Tile.isDragon(tile) ? 2 : 0;
  const seat = tile === input.seatWind ? 2 : 0;
  const round = tile === input.roundWind ? 2 : 0;
  return dragon + seat + round;
};

const setFuOf = (block: Block, input: ScoreInput): number => {
  const terminalOrHonor = Tile.isYaochu(block.tile);
  const kan = block.type === "kan";
  const open = isOpenSetForWin(input, block);
  if (kan && open) return terminalOrHonor ? 16 : 8;
  if (kan && !open) return terminalOrHonor ? 32 : 16;
  if (open) return terminalOrHonor ? 4 : 2;
  return terminalOrHonor ? 8 : 4;
};

const roundUpFu = (fu: number): number => Math.ceil(fu / 10) * 10;

const calculatePayments = ({
  han,
  fu,
  winType,
  isDealer,
  honba,
  riichiSticks,
  yakumanUnits,
}: Readonly<{
  han: number;
  fu: number;
  winType: WinType;
  isDealer: boolean;
  honba: number;
  riichiSticks: number;
  yakumanUnits?: number;
}>): Score => {
  const base = yakumanUnits !== undefined ? 8000 * yakumanUnits : limitedBase(han, fu);
  const stickBonus = riichiSticks * 1000;
  if (winType === "ron") {
    const amount = roundHundred(base * (isDealer ? 6 : 4)) + honba * 300;
    return {
      total: amount + stickBonus,
      payments: [{ from: "discarder", amount, count: 1 }],
    };
  }
  if (isDealer) {
    const amount = roundHundred(base * 2) + honba * 100;
    return {
      total: amount * 3 + stickBonus,
      payments: [{ from: "all", amount, count: 3 }],
    };
  }
  const dealer = roundHundred(base * 2) + honba * 100;
  const nonDealer = roundHundred(base) + honba * 100;
  return {
    total: dealer + nonDealer * 2 + stickBonus,
    payments: [
      { from: "dealer", amount: dealer, count: 1 },
      { from: "non_dealer", amount: nonDealer, count: 2 },
    ],
  };
};

const limitedBase = (han: number, fu: number): number => {
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  const base = fu * 2 ** (han + 2);
  if (han >= 5 || base >= 2000) return 2000;
  return base;
};

const roundHundred = (value: number): number => Math.ceil(value / 100) * 100;

const allTilesOf = (input: ScoreInput, division: HandDivision): readonly TileValue[] => {
  if (division.kind === "standard") {
    return division.blocks.flatMap((block) => block.tiles);
  }
  return input.hand;
};

const isValuePair = (block: Block, input: ScoreInput): boolean => pairFuOf(block, input) > 0;

const isValueTriplet = (block: Block, input: ScoreInput): boolean => {
  const tile = Tile.normalize(block.tile);
  return Tile.isDragon(tile) || tile === input.seatWind || tile === input.roundWind;
};

const hasFuWait = (input: ScoreInput, division: HandDivision): boolean => {
  const winTile = Tile.normalize(input.winTile);
  const pairWait = division.blocks.some((block) => block.type === "pair" && Tile.normalize(block.tile) === winTile);
  const sequenceWait = division.blocks
    .filter((block) => block.type === "sequence" && block.tiles.some((tile) => Tile.normalize(tile) === winTile))
    .some((block) => {
      const numbers = block.tiles.map((tile) => Tile.number(tile)).filter((number): number is number => number !== undefined).sort((a, b) => a - b);
      const winNumber = Tile.number(winTile);
      if (winNumber === undefined || numbers.length !== 3) {
        return false;
      }
      return (numbers[0] === 1 && winNumber === 3) || (numbers[0] === 7 && winNumber === 7) || winNumber === numbers[1];
    });
  return pairWait || sequenceWait;
};

const hasIipeikou = (sequences: readonly Block[]): boolean => countSequencePairs(sequences) >= 1;

const countSequencePairs = (sequences: readonly Block[]): number => {
  const keys = sequences.map(sequenceKey);
  return Array.from(new Set(keys)).reduce((total, key) => total + Math.floor(keys.filter((candidate) => candidate === key).length / 2), 0);
};

const sequenceKey = (block: Block): string => block.tiles.map((tile) => Tile.normalize(tile)).join("-");

const hasSanshokuDoujun = (sequences: readonly Block[]): boolean => {
  return Array.from({ length: 7 }).some((_, index) => {
    const number = index + 1;
    return ["m", "p", "s"].every((suit) =>
      sequences.some((block) => sequenceKey(block) === `${number}${suit}-${number + 1}${suit}-${number + 2}${suit}`),
    );
  });
};

const hasSanshokuDoukou = (triplets: readonly Block[]): boolean => {
  return Array.from({ length: 9 }).some((_, index) => {
    const number = index + 1;
    return ["m", "p", "s"].every((suit) => triplets.some((block) => Tile.normalize(block.tile) === `${number}${suit}`));
  });
};

const hasIttsu = (sequences: readonly Block[]): boolean => {
  return ["m", "p", "s"].some((suit) =>
    ["1", "4", "7"].every((number) =>
      sequences.some((block) => sequenceKey(block).startsWith(`${number}${suit}`)),
    ),
  );
};

const hasChanta = (blocks: readonly Block[]): boolean =>
  blocks.every((block) => block.tiles.some((tile) => Tile.isYaochu(tile))) && blocks.some((block) => block.type === "sequence");

const hasJunchan = (blocks: readonly Block[]): boolean =>
  blocks.every((block) => block.tiles.some((tile) => Tile.isTerminal(tile) && !Tile.isHonor(tile))) &&
  blocks.some((block) => block.type === "sequence");

const hasShousangen = (blocks: readonly Block[], triplets: readonly Block[]): boolean => {
  const dragonTriplets = triplets.filter((block) => Tile.isDragon(block.tile)).length;
  const dragonPairs = blocks.filter((block) => block.type === "pair" && Tile.isDragon(block.tile)).length;
  return dragonTriplets === 2 && dragonPairs === 1;
};

const getFlush = (tiles: readonly TileValue[]): "honitsu" | "chinitsu" | undefined => {
  const suits = new Set(tiles.map((tile) => Tile.suit(tile)).filter((suit): suit is "m" | "p" | "s" => suit !== undefined));
  if (suits.size !== 1) {
    return undefined;
  }
  return tiles.some((tile) => Tile.isHonor(tile)) ? "honitsu" : "chinitsu";
};

const isChuuren = (tiles: readonly TileValue[]): boolean => {
  const normalized = tiles.map((tile) => Tile.normalize(tile));
  const suits = new Set(normalized.map((tile) => Tile.suit(tile)).filter((suit): suit is "m" | "p" | "s" => suit !== undefined));
  if (suits.size !== 1 || normalized.some((tile) => Tile.isHonor(tile))) {
    return false;
  }
  const suit = Array.from(suits)[0];
  const counts = Array.from({ length: 9 }, (_, index) => normalized.filter((tile) => tile === `${index + 1}${suit}`).length);
  return counts[0] >= 3 && counts[8] >= 3 && counts.slice(1, 8).every((count) => count >= 1);
};

const hasPairWait = (input: ScoreInput, division: HandDivision): boolean =>
  division.blocks.some((block) => block.type === "pair" && Tile.normalize(block.tile) === Tile.normalize(input.winTile));

const isOpenSetForWin = (input: ScoreInput, block: Block): boolean =>
  block.open ||
  (input.winType === "ron" &&
    block.type === "triplet" &&
    block.tiles.some((tile) => Tile.normalize(tile) === Tile.normalize(input.winTile)));

const isKokushiThirteenWait = (input: ScoreInput): boolean => {
  const counts = Hand.counts(input.hand);
  const winIndex = Tile.indexOf(input.winTile);
  return counts[winIndex] === 2;
};
