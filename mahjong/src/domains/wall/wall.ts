import { Seat, type SeatIndex } from "@/src/domains/seat";
import { Tile } from "@/src/domains/tile";

/**
 * 牌山。136枚を洗牌し、末尾14枚を王牌(嶺上牌4枚・ドラ表示牌5枚・裏ドラ表示牌5枚)として確保する。
 * `live` の先頭からツモり、カンのたびに嶺上牌をツモると同時にツモ可能枚数が1枚減る。
 */
export type Wall = Readonly<{
  live: readonly Tile[];
  drawn: number;
  rinshan: readonly Tile[];
  rinshanDrawn: number;
  doraIndicators: readonly Tile[];
  uraIndicators: readonly Tile[];
  /** めくられているドラ表示牌の枚数(1〜5) */
  revealed: number;
}>;

export type DrawResult = Readonly<{ wall: Wall; tile: Tile }>;
export type DealResult = Readonly<{ wall: Wall; hands: readonly (readonly Tile[])[] }>;

const TOTAL_TILES = 136;
const DEAD_WALL = 14;
const RINSHAN_COUNT = 4;
const INDICATOR_COUNT = 5;
const HAND_SIZE = 13;
const MAX_REVEALED = 5;

const layout = (tiles: readonly Tile[]): Wall => {
  const liveEnd = TOTAL_TILES - DEAD_WALL;
  const dead = tiles.slice(liveEnd);
  return {
    live: tiles.slice(0, liveEnd),
    drawn: 0,
    rinshan: dead.slice(0, RINSHAN_COUNT),
    rinshanDrawn: 0,
    doraIndicators: dead.slice(RINSHAN_COUNT, RINSHAN_COUNT + INDICATOR_COUNT),
    uraIndicators: dead.slice(RINSHAN_COUNT + INDICATOR_COUNT, DEAD_WALL),
    revealed: 1,
  };
};

const shuffle = (tiles: readonly Tile[], rng: () => number): readonly Tile[] =>
  tiles
    .map((tile) => ({ tile, key: rng() }))
    .toSorted((a, b) => a.key - b.key)
    .map((entry) => entry.tile);

export const Wall = {
  /** 洗牌した牌山を作る。赤ドラありなら各色の5を1枚ずつ赤5にする */
  create(rng: () => number, akaDora: boolean): Wall {
    return layout(shuffle(Tile.fullSet(akaDora), rng));
  },

  /** 並び順を指定した牌山(洗牌しない)。136枚でなければ undefined */
  fromTiles(tiles: readonly Tile[]): Wall | undefined {
    return tiles.length === TOTAL_TILES ? layout(tiles) : undefined;
  },

  /** ツモ可能な残り枚数(王牌を除く) */
  remaining(wall: Wall): number {
    return wall.live.length - wall.drawn - wall.rinshanDrawn;
  },

  draw(wall: Wall): DrawResult | undefined {
    if (Wall.remaining(wall) <= 0) return undefined;
    return { wall: { ...wall, drawn: wall.drawn + 1 }, tile: wall.live[wall.drawn] };
  },

  /** カン後の嶺上牌ツモ。海底牌が王牌に繰り入れられるためツモ可能枚数も1枚減る */
  drawRinshan(wall: Wall): DrawResult | undefined {
    if (!Wall.canKan(wall)) return undefined;
    return { wall: { ...wall, rinshanDrawn: wall.rinshanDrawn + 1 }, tile: wall.rinshan[wall.rinshanDrawn] };
  },

  /** 嶺上牌が残っていて、ツモ可能な牌が1枚以上ある場合にカンできる */
  canKan(wall: Wall): boolean {
    return wall.rinshanDrawn < RINSHAN_COUNT && Wall.remaining(wall) > 0;
  },

  /** 新ドラ表示牌を1枚めくる(最大5枚) */
  revealDora(wall: Wall): Wall {
    return { ...wall, revealed: Math.min(wall.revealed + 1, MAX_REVEALED) };
  },

  doraIndicators(wall: Wall): readonly Tile[] {
    return wall.doraIndicators.slice(0, wall.revealed);
  },

  uraDoraIndicators(wall: Wall): readonly Tile[] {
    return wall.uraIndicators.slice(0, wall.revealed);
  },

  /** 親から順に13枚ずつ配牌する。戻り値の hands は席番号で添字付けされる */
  deal(wall: Wall, dealer: SeatIndex): DealResult {
    const hands = Seat.all().map((seat) => {
      const order = Seat.distanceFrom(dealer, seat);
      const start = wall.drawn + order * HAND_SIZE;
      return Tile.sort(wall.live.slice(start, start + HAND_SIZE));
    });
    return { wall: { ...wall, drawn: wall.drawn + HAND_SIZE * 4 }, hands };
  },
} as const;
