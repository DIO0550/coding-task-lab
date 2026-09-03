import { GameState } from "@/src/domains/game-state";
import { PlayerAction } from "@/src/domains/player-action";
import { PlayerConfig } from "@/src/domains/player-config";
import { RuleConfig } from "@/src/domains/rule-config";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { Tile } from "@/src/domains/tile";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { GameEngine, type GameSetup } from "..";

/**
 * テスト用: 配牌・ツモ順・ドラ表示牌を指定した136枚の牌山を組み立てる。
 * 指定しなかった牌は残りの牌セットから順に埋める。
 */
export type WallSpec = Readonly<{
  /** 席番号順の配牌(13枚ずつ)。null の席は鳴けない配牌で自動的に埋める */
  hands: readonly (readonly Tile[] | null)[];
  /** 親の第一ツモから手番順に並ぶツモ牌 */
  draws?: readonly Tile[];
  /** 山の末尾(海底側)に置く牌。withRemaining と組み合わせて海底・河底をテストする */
  haitei?: readonly Tile[];
  doraIndicators?: readonly Tile[];
  rinshan?: readonly Tile[];
  dealer?: SeatIndex;
}>;

/** 1m4m7m… のように互いに鳴けない(対子も連続も持たない)配牌 */
export const JUNK_HANDS: readonly (readonly Tile[])[] = [
  ["1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "pei"],
  ["2m", "5m", "8m", "2p", "5p", "8p", "2s", "5s", "8s", "ton", "nan", "sha", "pei"],
  ["3m", "6m", "9m", "3p", "6p", "9p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"],
  ["1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "haku", "hatsu", "chun", "ton"],
];

const removeUsed = (pool: readonly Tile[], used: readonly Tile[]): readonly Tile[] =>
  used.reduce<readonly Tile[]>((rest, tile) => {
    const next = Tile.removeOne(rest, tile);
    if (next.length === rest.length) throw new Error(`牌 ${tile} が5枚以上使われています`);
    return next;
  }, pool);

/** 対子も連続もできない牌だけを集める(鳴きもテンパイも起こらない配牌) */
const compatible = (hand: readonly Tile[], tile: Tile): boolean =>
  Tile.isHonor(tile)
    ? !hand.some((t) => Tile.equals(t, tile))
    : !hand.some((t) => Tile.isSameSuit(t, tile) && Math.abs(Tile.rank(t) - Tile.rank(tile)) <= 2);

const rotate = <T>(items: readonly T[], offset: number): readonly T[] => [...items.slice(offset), ...items.slice(0, offset)];

/**
 * 指定した牌(テスト対象の配牌・ツモ牌など)を避けて、鳴けない配牌を4席分作る。
 * `fixed` の席はそのまま使い、null の席だけ生成する。
 */
export const fillJunkHands = (
  fixed: readonly (readonly Tile[] | null)[],
  avoid: readonly Tile[] = [],
): readonly (readonly Tile[])[] => {
  const used = [...fixed.flatMap((hand) => hand ?? []), ...avoid];
  const initial = { hands: [] as readonly (readonly Tile[])[], pool: removeUsed(Tile.fullSet(false), used) };
  return fixed.reduce((acc, hand, seat) => {
    if (hand !== null) return { ...acc, hands: [...acc.hands, hand] };
    const built = rotate(Tile.kinds(), seat).reduce(
      (inner, kind) => {
        const available = inner.pool.some((t) => Tile.equals(t, kind));
        if (inner.hand.length >= 13 || !available || !compatible(inner.hand, kind)) return inner;
        return { hand: [...inner.hand, kind], pool: Tile.removeOne(inner.pool, kind) };
      },
      { hand: [] as readonly Tile[], pool: acc.pool },
    );
    return { hands: [...acc.hands, Tile.sort(built.hand)], pool: built.pool };
  }, initial).hands;
};

export const arrangeWall = (spec: WallSpec): readonly Tile[] => {
  const dealer = spec.dealer ?? 0;
  const draws = spec.draws ?? [];
  const rinshan = spec.rinshan ?? [];
  const doraIndicators = spec.doraIndicators ?? [];
  const haitei = spec.haitei ?? [];
  const hands = fillJunkHands(spec.hands, [...draws, ...haitei, ...rinshan, ...doraIndicators]);
  const dealOrder = Seat.all().map((_, i) => Seat.offset(dealer, i));
  const dealt = dealOrder.flatMap((seat) => hands[seat]);
  const pool = removeUsed(Tile.fullSet(false), [...dealt, ...draws, ...haitei, ...rinshan, ...doraIndicators]);
  const liveRest = 122 - dealt.length - draws.length - haitei.length;
  const live = [...dealt, ...draws, ...pool.slice(0, liveRest), ...haitei];
  const afterLive = pool.slice(liveRest);
  const rinshanFull = [...rinshan, ...afterLive.slice(0, 4 - rinshan.length)];
  const afterRinshan = afterLive.slice(4 - rinshan.length);
  const doraFull = [...doraIndicators, ...afterRinshan.slice(0, 5 - doraIndicators.length)];
  const ura = afterRinshan.slice(5 - doraIndicators.length);
  return [...live, ...rinshanFull, ...doraFull, ...ura];
};

export const RNG = (): (() => number) => createSeededRandom(2026);

export type StartOptions = WallSpec &
  Readonly<{
    rules?: Partial<RuleConfig>;
    players?: readonly PlayerConfig[];
    initial?: GameSetup["initial"];
  }>;

export const allCpu = (): readonly PlayerConfig[] => [
  PlayerConfig.cpu("CPU 0", "standard"),
  PlayerConfig.cpu("CPU 1", "standard"),
  PlayerConfig.cpu("CPU 2", "standard"),
  PlayerConfig.cpu("CPU 3", "standard"),
];

/** 全員人間(手番進行をテストが完全に制御できる) */
export const allHuman = (): readonly PlayerConfig[] => [
  PlayerConfig.human("P0"),
  PlayerConfig.human("P1"),
  PlayerConfig.human("P2"),
  PlayerConfig.human("P3"),
];

export const startGame = (options: StartOptions): GameState =>
  GameEngine.start(
    {
      players: options.players ?? allHuman(),
      rules: RuleConfig.with(RuleConfig.default(), { akaDora: false, ...options.rules }),
      wallTiles: arrangeWall(options),
      initial: { dealer: options.dealer ?? 0, ...options.initial },
    },
    RNG(),
  );

export const apply = (game: GameState, seat: SeatIndex, action: PlayerAction): GameState =>
  GameEngine.apply(game, seat, action, RNG());

export const discard = (game: GameState, seat: SeatIndex, tile: Tile, riichi = false): GameState =>
  apply(game, seat, PlayerAction.discard(tile, riichi));

export const confirm = (game: GameState): GameState => apply(game, 0, PlayerAction.confirmResult());

/** 手牌の末尾(最も大きい字牌)を切って手番を流す */
export const passTurn = (game: GameState, seat: SeatIndex): GameState => {
  const hand = game.round.seats[seat].hand;
  return discard(game, seat, hand[hand.length - 1]);
};

export const actionTypes = (game: GameState, seat: SeatIndex): readonly string[] =>
  GameEngine.availableActions(game, seat).map((action) => action.type);

/** 山の残りを指定枚数にする(流局・海底のテスト用) */
export const withRemaining = (game: GameState, remaining: number): GameState => ({
  ...game,
  round: {
    ...game.round,
    wall: { ...game.round.wall, drawn: game.round.wall.live.length - game.round.wall.rinshanDrawn - remaining },
  },
});

/** CPU だけの対局を1ステップ進める: 終局なら何もしない、局が終わっていれば結果を確定、それ以外は CPU の1手 */
export const stepCpu = (game: GameState, rng: () => number): GameState => {
  if (GameState.isFinished(game)) return game;
  if (game.round.phase.type === "ended") return GameEngine.apply(game, 0, PlayerAction.confirmResult(), rng);
  return GameEngine.advanceCpu(game, rng);
};
