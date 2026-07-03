import { Tile, type HonorTile, type Suit } from "@/src/domains/tile";
import type { Rng } from "@/src/types/random";

/** 王牌の枚数(嶺上4 + ドラ表示5 + 裏ドラ表示5) */
const DEAD_WALL_SIZE = 14;
/** 嶺上牌の枚数(=成立できるカンの上限) */
const RINSHAN_SLOTS = 4;
/** 王牌内のドラ表示牌の開始位置 */
const DORA_OFFSET = 4;
/** 王牌内の裏ドラ表示牌の開始位置 */
const URA_OFFSET = 9;
/** ドラ表示牌の最大枚数(初期1 + カン4回) */
const MAX_DORA_INDICATORS = 5;
const HAND_SIZE = 13;
const PLAYER_COUNT = 4;

/**
 * 牌山。live の先頭からツモる。
 * dead は王牌14枚([0..3] 嶺上牌 / [4..8] ドラ表示牌 / [9..13] 裏ドラ表示牌)。
 * 嶺上ツモのたびに生牌山の末尾1枚を王牌へ移す(dead の15枚目以降に置かれ、参照されない)。
 */
export type Wall = Readonly<{
  live: readonly Tile[];
  dead: readonly Tile[];
  /** ツモ済みの嶺上牌の数(=成立したカンの数) */
  rinshanDrawn: number;
  /** めくられているドラ表示牌の枚数(1..5) */
  doraCount: number;
}>;

const SUITS: readonly Suit[] = ["m", "p", "s"];

const HONORS: readonly HonorTile[] = [
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun",
];

/** 全136枚の牌を生成する。赤ドラありなら 5m/5p/5s の各1枚を赤5に置き換える */
const buildTiles = (akaDora: boolean): readonly Tile[] => {
  const suited = SUITS.flatMap((suit) =>
    Array.from({ length: 9 }, (_, i) => i + 1).flatMap((n) =>
      Array.from({ length: 4 }, (_, copy): Tile => {
        if (akaDora && n === 5 && copy === 0) {
          return `0${suit}`;
        }
        return `${n}${suit}` as Tile;
      }),
    ),
  );
  const honors = HONORS.flatMap((honor) =>
    Array.from({ length: 4 }, (): Tile => honor),
  );
  return [...suited, ...honors];
};

/** Fisher–Yates によるシャッフル(コピーに対して行う) */
const shuffle = (tiles: readonly Tile[], rng: Rng): readonly Tile[] => {
  const result = [...tiles];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
};

export const Wall = {
  /** 牌山を生成・洗牌し、王牌14枚を確保してドラ表示牌を1枚めくる */
  create(rng: Rng, options: Readonly<{ akaDora: boolean }>): Wall {
    const shuffled = shuffle(buildTiles(options.akaDora), rng);
    const liveSize = shuffled.length - DEAD_WALL_SIZE;
    return {
      live: shuffled.slice(0, liveSize),
      dead: shuffled.slice(liveSize),
      rinshanDrawn: 0,
      doraCount: 1,
    };
  },

  /** ツモ可能な残り枚数(王牌14枚を除く) */
  liveCount(wall: Wall): number {
    return wall.live.length;
  },

  canDraw(wall: Wall): boolean {
    return wall.live.length > 0;
  },

  /** 山から1枚ツモる。山が尽きていれば null */
  draw(wall: Wall): Readonly<{ wall: Wall; tile: Tile }> | null {
    if (wall.live.length === 0) {
      return null;
    }
    return {
      wall: { ...wall, live: wall.live.slice(1) },
      tile: wall.live[0],
    };
  },

  /** 起家から順に13枚ずつ4人分を配牌する。hands[0] が親の手牌 */
  deal(
    wall: Wall,
  ): Readonly<{ wall: Wall; hands: readonly (readonly Tile[])[] }> | null {
    const dealTotal = HAND_SIZE * PLAYER_COUNT;
    if (wall.live.length < dealTotal) {
      return null;
    }
    const hands = Array.from({ length: PLAYER_COUNT }, (_, i) =>
      wall.live.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE),
    );
    return {
      wall: { ...wall, live: wall.live.slice(dealTotal) },
      hands,
    };
  },

  /** カン(嶺上ツモ)が可能か。残り山0枚・嶺上4枚消費済みなら不可 */
  canRinshan(wall: Wall): boolean {
    return wall.live.length > 0 && wall.rinshanDrawn < RINSHAN_SLOTS;
  },

  /**
   * 嶺上牌を1枚ツモる。生牌山の末尾1枚を王牌へ移し(ツモ可能枚数が1減る)、
   * 新ドラ表示牌を1枚めくる。
   */
  drawRinshan(wall: Wall): Readonly<{ wall: Wall; tile: Tile }> | null {
    if (!Wall.canRinshan(wall)) {
      return null;
    }
    const tile = wall.dead[wall.rinshanDrawn];
    const moved = wall.live[wall.live.length - 1];
    return {
      wall: {
        live: wall.live.slice(0, -1),
        dead: [...wall.dead, moved],
        rinshanDrawn: wall.rinshanDrawn + 1,
        doraCount: Math.min(wall.doraCount + 1, MAX_DORA_INDICATORS),
      },
      tile,
    };
  },

  /** めくられているドラ表示牌 */
  doraIndicators(wall: Wall): readonly Tile[] {
    return wall.dead.slice(DORA_OFFSET, DORA_OFFSET + wall.doraCount);
  },

  /** 裏ドラ表示牌(リーチ和了時にめくる分。表示牌と同じ枚数) */
  uraIndicators(wall: Wall): readonly Tile[] {
    return wall.dead.slice(URA_OFFSET, URA_OFFSET + wall.doraCount);
  },
} as const;
