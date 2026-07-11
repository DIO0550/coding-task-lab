import { Tile } from "../../tile/index.ts";
import { Hand } from "../../hand/index.ts";
import { Random } from "../../../libs/random/index.ts";
import { Game } from "../../game/index.ts";
import type {
  Action,
  Discard,
  GameState,
  PlayerConfig,
  PlayerView,
  PublicPlayer,
  RuleConfig,
  Seat,
  SeatWind,
} from "../../game/index.ts";

/** 牌表記→Tile(テスト専用。表記不正は例外) */
export const t = (notation: string): Tile => {
  const tile = Tile.parse(notation);
  if (tile === null) {
    throw new Error(`invalid tile notation: ${notation}`);
  }
  return tile;
};

export const ts = (...notations: readonly string[]): readonly Tile[] =>
  notations.map(t);

export const n = (tile: Tile): string => Tile.toNotation(tile);

export const defaultRule = (overrides?: Partial<RuleConfig>): RuleConfig => ({
  format: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: false,
  cpuAutoWin: true,
  ...overrides,
});

export const cpuPlayers = (): readonly PlayerConfig[] => [
  { kind: "cpu", name: "P0", level: "beginner" },
  { kind: "cpu", name: "P1", level: "standard" },
  { kind: "cpu", name: "P2", level: "advanced" },
  { kind: "cpu", name: "P3", level: "standard" },
];

/** どの局面でもテンパイ・鳴き・ロンが発生しない捨て牌用の手 */
export const JUNK_B: readonly string[] = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "4s", "7s", "haku", "hatsu", "chun", "ton"];
export const JUNK_C: readonly string[] = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "haku", "hatsu", "chun"];

/** 5m/8m 待ちの面前テンパイ手(234m 456p 789s 55s + 67m) */
export const TENPAI_HAND: readonly string[] = ["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "5s", "5s", "6m", "7m"];

export type OrderSpec = Readonly<{
  /** 各席の配牌(13枚×4) */
  hands: readonly (readonly string[])[];
  /** ツモ順(先頭=親の第1ツモ)。残りは未使用牌で自動補充 */
  draws?: readonly string[];
  /** 表ドラ表示牌(最大5枚。先頭が開局時公開) */
  doraIndicators?: readonly string[];
}>;

const DRAW_PILE_SIZE = 70;
const RINSHAN_SIZE = 4;
const INDICATOR_SIZE = 5;

/**
 * 部分指定から136枚の固定牌山を作る。指定牌をプールから取り出し、
 * 未指定のスロットは残り牌で順に埋める
 */
export const buildOrder = (spec: OrderSpec): readonly Tile[] => {
  const pool: Tile[] = [];
  for (const kind of Tile.all()) {
    for (let copy = 0; copy < 4; copy += 1) {
      pool.push(kind);
    }
  }
  const takeExact = (notation: string): Tile => {
    const index = pool.findIndex((tile) => Tile.toNotation(tile) === notation);
    if (index < 0) {
      throw new Error(`tile not available in pool: ${notation}`);
    }
    return pool.splice(index, 1)[0];
  };
  if (spec.hands.length !== 4 || spec.hands.some((hand) => hand.length !== 13)) {
    throw new Error("hands must be 4 x 13 tiles");
  }
  const hands = spec.hands.map((hand) => hand.map(takeExact));
  const draws = (spec.draws ?? []).map(takeExact);
  const dora = (spec.doraIndicators ?? []).map(takeExact);
  const fill = (taken: readonly Tile[], size: number): readonly Tile[] => {
    if (taken.length > size) {
      throw new Error("too many tiles specified");
    }
    return [...taken, ...pool.splice(0, size - taken.length)];
  };
  return [
    ...hands.flat(),
    ...fill(draws, DRAW_PILE_SIZE),
    ...fill([], RINSHAN_SIZE),
    ...fill(dora, INDICATOR_SIZE),
    ...fill([], INDICATOR_SIZE),
  ];
};

/** 固定牌山で対局を開始する(親=seat0 が第1ツモを持った状態) */
export const startWithOrder = (
  spec: OrderSpec,
  rule?: Partial<RuleConfig>,
): GameState =>
  Game.start(defaultRule(rule), cpuPlayers(), Random.seeded(1), {
    wallOrder: buildOrder(spec),
  });

/** 応答フェーズなら全員パスさせる(それ以外はそのまま返す) */
export const passAll = (state: GameState): GameState => {
  let current = state;
  for (let guard = 0; guard < 8 && current.phase === "response"; guard += 1) {
    const seat = current.pendingResponders?.[0];
    if (seat === undefined) {
      break;
    }
    current = Game.apply(current, seat, { type: "pass" });
  }
  return current;
};

/** 指定席が指定牌を切り、他家の応答は全員パスさせる */
export const discardBy = (
  state: GameState,
  seat: Seat,
  notation: string,
): GameState =>
  passAll(Game.apply(state, seat, { type: "discard", tile: t(notation) }));

const SEAT_WINDS: readonly SeatWind[] = ["ton", "nan", "sha", "pei"];

export type DirectViewSpec = Readonly<{
  /** 自分の手牌(13-3m 枚) */
  hand: readonly string[];
  /** 直前ツモ牌 */
  drawn?: string;
  /** 席ごとの河(表記の列)。省略した席は空 */
  discards?: Partial<Record<Seat, readonly string[]>>;
  /** リーチ中の席 */
  riichiSeats?: readonly Seat[];
  doraIndicators?: readonly string[];
}>;

const toDiscards = (notations: readonly string[]): readonly Discard[] =>
  notations.map((notation) => ({
    tile: t(notation),
    tsumogiri: false,
    riichiDeclare: false,
    calledBy: null,
  }));

/** 表記の重複を除いた牌一覧 */
const distinctByNotation = (tiles: readonly Tile[]): readonly Tile[] => {
  const seen = new Set<string>();
  return tiles.filter((tile) => {
    const key = Tile.toNotation(tile);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const removeFirst = (
  tiles: readonly Tile[],
  target: Tile,
): readonly Tile[] => {
  const index = tiles.findIndex((tile) => Tile.equalsExact(tile, target));
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

/**
 * 手番(action)の PlayerView を直接組み立てる(seat0 視点・副露なし)。
 * legalActions はエンジンと同じ規則(全打牌+テンパイを保つリーチ宣言)で作る
 */
export const directView = (spec: DirectViewSpec): PlayerView => {
  const hand = ts(...spec.hand);
  const drawn = spec.drawn === undefined ? null : t(spec.drawn);
  const concealed = drawn === null ? hand : [...hand, drawn];
  const kinds = distinctByNotation(concealed);
  const riichiActions: readonly Action[] = kinds
    .filter((tile) => Hand.waits(removeFirst(concealed, tile), []).length > 0)
    .map((tile) => ({ type: "riichi", tile }) as const);
  const discardActions: readonly Action[] = kinds.map(
    (tile) => ({ type: "discard", tile }) as const,
  );
  const players: readonly PublicPlayer[] = ([0, 1, 2, 3] as const).map(
    (seat) => ({
      seat,
      name: `P${seat}`,
      wind: SEAT_WINDS[seat],
      points: 25000,
      isDealer: seat === 0,
      melds: [],
      discards: toDiscards(spec.discards?.[seat] ?? []),
      riichi: (spec.riichiSeats ?? []).includes(seat) ? "riichi" : "none",
      handCount: 13,
    }),
  );
  return {
    self: 0,
    hand,
    drawn,
    melds: [],
    players,
    doraIndicators: ts(...(spec.doraIndicators ?? ["9p"])),
    roundWind: "ton",
    roundNumber: 1,
    honba: 0,
    riichiSticks: (spec.riichiSeats ?? []).length,
    wallRemaining: 60,
    phase: "action",
    lastDiscard: null,
    legalActions: [...riichiActions, ...discardActions],
  };
};
