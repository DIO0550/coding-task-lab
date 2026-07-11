import { Tile } from "../../tile/index.ts";
import { Random } from "../../../libs/random/index.ts";
import { Game } from "../index.ts";
import type {
  Action,
  GameState,
  PlayerConfig,
  RuleConfig,
  Seat,
} from "../index.ts";

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

export const defaultRule = (
  overrides?: Partial<RuleConfig>,
): RuleConfig => ({
  format: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: false,
  cpuAutoWin: true,
  ...overrides,
});

export const fourPlayers = (): readonly PlayerConfig[] => [
  { kind: "human", name: "P0", level: null },
  { kind: "cpu", name: "P1", level: "beginner" },
  { kind: "cpu", name: "P2", level: "standard" },
  { kind: "cpu", name: "P3", level: "advanced" },
];

/**
 * どの局面でもテンパイ・鳴き・ロンが発生しない捨て牌用の手
 * (同スート内の牌が常に3以上離れており、全種1枚ずつ)。
 * junkA/B/C は互いに数牌が重複しないので3席分同時に使える
 */
export const JUNK_A: readonly string[] = ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
export const JUNK_B: readonly string[] = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "4s", "7s", "haku", "hatsu", "chun", "ton"];
export const JUNK_C: readonly string[] = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "haku", "hatsu", "chun"];

export type OrderSpec = Readonly<{
  /** 各席の配牌(13枚×4) */
  hands: readonly (readonly string[])[];
  /** ツモ順(先頭=親の第1ツモ)。残りは未使用牌で自動補充 */
  draws?: readonly string[];
  /** 嶺上牌(最大4枚。前方から使用) */
  rinshan?: readonly string[];
  /** 表ドラ表示牌(最大5枚。先頭が開局時公開) */
  doraIndicators?: readonly string[];
  /** 裏ドラ表示牌(最大5枚) */
  uraIndicators?: readonly string[];
  akaDora?: boolean;
}>;

const DRAW_PILE_SIZE = 70;
const RINSHAN_SIZE = 4;
const INDICATOR_SIZE = 5;

/**
 * 部分指定から136枚の固定牌山(Wall.buildFromOrder 用の並び)を作る。
 * 指定牌を全体プールから取り出し、未指定のスロットは残り牌で順に埋める
 */
export const buildOrder = (spec: OrderSpec): readonly Tile[] => {
  const pool: Tile[] = [];
  for (const kind of Tile.all()) {
    for (let copy = 0; copy < 4; copy += 1) {
      const red =
        (spec.akaDora ?? false) &&
        kind.suit !== "z" &&
        kind.rank === 5 &&
        copy === 0;
      pool.push(red ? { ...kind, red: true } : kind);
    }
  }
  const takeExact = (notation: string): Tile => {
    const index = pool.findIndex((tile) => Tile.toNotation(tile) === notation);
    if (index < 0) {
      throw new Error(`tile not available in pool: ${notation}`);
    }
    return pool.splice(index, 1)[0];
  };
  if (spec.hands.length !== 4 || spec.hands.some((h) => h.length !== 13)) {
    throw new Error("hands must be 4 x 13 tiles");
  }
  const hands = spec.hands.map((hand) => hand.map(takeExact));
  const draws = (spec.draws ?? []).map(takeExact);
  const rinshan = (spec.rinshan ?? []).map(takeExact);
  const dora = (spec.doraIndicators ?? []).map(takeExact);
  const ura = (spec.uraIndicators ?? []).map(takeExact);
  const fill = (taken: readonly Tile[], size: number): readonly Tile[] => {
    if (taken.length > size) {
      throw new Error("too many tiles specified");
    }
    return [...taken, ...pool.splice(0, size - taken.length)];
  };
  return [
    ...hands.flat(),
    ...fill(draws, DRAW_PILE_SIZE),
    ...fill(rinshan, RINSHAN_SIZE),
    ...fill(dora, INDICATOR_SIZE),
    ...fill(ura, INDICATOR_SIZE),
  ];
};

/** 固定牌山で対局を開始する */
export const startWithOrder = (
  spec: OrderSpec,
  rule?: Partial<RuleConfig>,
): GameState =>
  Game.start(
    defaultRule({ akaDora: spec.akaDora ?? false, ...rule }),
    fourPlayers(),
    Random.seeded(1),
    { wallOrder: buildOrder(spec) },
  );

/** 応答フェーズなら全員パスさせる(それ以外はそのまま) */
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

/** 手番プレイヤーが指定牌を切る(残る応答は全員パス) */
export const discardBy = (
  state: GameState,
  seat: Seat,
  notation: string,
): GameState =>
  passAll(Game.apply(state, seat, { type: "discard", tile: t(notation) }));

/** 手番プレイヤーがツモ切りする(応答は全員パス) */
export const tsumogiri = (state: GameState): GameState => {
  const seat = state.turn;
  const drawn = state.players[seat].drawn;
  if (drawn === null) {
    throw new Error("no drawn tile to discard");
  }
  return passAll(Game.apply(state, seat, { type: "discard", tile: drawn }));
};

/** 全員ツモ切りで指定回数だけ手番を進める */
export const tsumogiriTimes = (state: GameState, times: number): GameState => {
  let current = state;
  for (let i = 0; i < times; i += 1) {
    current = tsumogiri(current);
  }
  return current;
};

/** 行動一覧から type だけ抜き出す */
export const actionTypes = (
  actions: readonly Action[],
): readonly string[] => actions.map((action) => action.type);

/** 荒牌流局まで全員ツモ切りで進める */
export const runToExhaustion = (state: GameState): GameState => {
  let current = state;
  for (let guard = 0; guard < 200; guard += 1) {
    if (current.phase !== "action") {
      return current;
    }
    current = tsumogiri(current);
  }
  throw new Error("round did not end within guard limit");
};
