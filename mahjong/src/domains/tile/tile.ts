export type Suit = "m" | "p" | "s";
export type NumberRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HonorKind = "ton" | "nan" | "sha" | "pei" | "haku" | "hatsu" | "chun";

export type NumberTile = Readonly<{
  kind: "number";
  suit: Suit;
  rank: NumberRank;
  red: boolean;
}>;
export type HonorTile = Readonly<{ kind: "honor"; honor: HonorKind }>;
export type Tile = NumberTile | HonorTile;

const SUITS: readonly Suit[] = ["m", "p", "s"];
const HONORS: readonly HonorKind[] = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"];
const GREEN_NUMBER_RANKS: readonly NumberRank[] = [2, 3, 4, 6, 8];
const WIND_CYCLE: readonly HonorKind[] = ["ton", "nan", "sha", "pei"];
const DRAGON_CYCLE: readonly HonorKind[] = ["haku", "hatsu", "chun"];

const isSuit = (value: string): value is Suit =>
  (SUITS as readonly string[]).includes(value);

const isHonorKind = (value: string): value is HonorKind =>
  (HONORS as readonly string[]).includes(value);

const parse = (s: string): Tile | null => {
  if (isHonorKind(s)) {
    return { kind: "honor", honor: s };
  }

  const match = /^([0-9])([mps])$/.exec(s);
  if (!match) {
    return null;
  }

  const digitStr = match[1];
  const suitStr = match[2];
  if (digitStr === undefined || suitStr === undefined || !isSuit(suitStr)) {
    return null;
  }

  const digit = Number(digitStr);
  if (digit === 0) {
    return { kind: "number", suit: suitStr, rank: 5, red: true };
  }
  return { kind: "number", suit: suitStr, rank: digit as NumberRank, red: false };
};

const format = (t: Tile): string => {
  if (t.kind === "honor") {
    return t.honor;
  }
  const digit = t.red ? 0 : t.rank;
  return `${digit}${t.suit}`;
};

const equals = (a: Tile, b: Tile): boolean => {
  if (a.kind === "honor" && b.kind === "honor") {
    return a.honor === b.honor;
  }
  if (a.kind === "number" && b.kind === "number") {
    return a.suit === b.suit && a.rank === b.rank;
  }
  return false;
};

const strictEquals = (a: Tile, b: Tile): boolean => {
  if (!equals(a, b)) {
    return false;
  }
  if (a.kind === "number" && b.kind === "number") {
    return a.red === b.red;
  }
  return true;
};

const suitOrder = (suit: Suit): number => SUITS.indexOf(suit);
const honorOrder = (honor: HonorKind): number => HONORS.indexOf(honor);

const orderKey = (t: Tile): number =>
  t.kind === "number" ? suitOrder(t.suit) * 9 + (t.rank - 1) : 27 + honorOrder(t.honor);

const compare = (a: Tile, b: Tile): number => {
  const diff = orderKey(a) - orderKey(b);
  if (diff !== 0) {
    return diff;
  }
  const aRed = a.kind === "number" && a.red ? 1 : 0;
  const bRed = b.kind === "number" && b.red ? 1 : 0;
  return aRed - bRed;
};

const toIndex34 = (t: Tile): number => orderKey(t);

const fromIndex34 = (i: number): Tile => {
  if (i < 27) {
    const suit = SUITS[Math.floor(i / 9)] as Suit;
    const rank = ((i % 9) + 1) as NumberRank;
    return { kind: "number", suit, rank, red: false };
  }
  return { kind: "honor", honor: HONORS[i - 27] as HonorKind };
};

const isHonor = (t: Tile): boolean => t.kind === "honor";
const isTerminal = (t: Tile): boolean => t.kind === "number" && (t.rank === 1 || t.rank === 9);
const isYaochuu = (t: Tile): boolean => isHonor(t) || isTerminal(t);

const isGreen = (t: Tile): boolean =>
  t.kind === "honor" ? t.honor === "hatsu" : t.suit === "s" && GREEN_NUMBER_RANKS.includes(t.rank);

const nextInSeries = (t: Tile): Tile => {
  if (t.kind === "number") {
    const nextRank = (t.rank === 9 ? 1 : t.rank + 1) as NumberRank;
    return { kind: "number", suit: t.suit, rank: nextRank, red: false };
  }

  const windIndex = WIND_CYCLE.indexOf(t.honor);
  if (windIndex !== -1) {
    const next = WIND_CYCLE[(windIndex + 1) % WIND_CYCLE.length] as HonorKind;
    return { kind: "honor", honor: next };
  }

  const dragonIndex = DRAGON_CYCLE.indexOf(t.honor);
  const next = DRAGON_CYCLE[(dragonIndex + 1) % DRAGON_CYCLE.length] as HonorKind;
  return { kind: "honor", honor: next };
};

const allKinds = (): readonly Tile[] => Array.from({ length: 34 }, (_, i) => fromIndex34(i));

export const Tile = {
  parse,
  format,
  equals,
  strictEquals,
  compare,
  toIndex34,
  fromIndex34,
  isHonor,
  isTerminal,
  isYaochuu,
  isGreen,
  nextInSeries,
  allKinds,
} as const;
