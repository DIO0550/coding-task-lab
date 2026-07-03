import { Tile } from "@/src/domains/tile";
import { Hand } from "@/src/domains/hand";
import type { Meld } from "@/src/domains/meld";
import type {
  ClaimOption,
  CpuLevel,
  GameAction,
  PlayerView,
  TurnActions,
} from "@/src/domains/game";

/**
 * CPU 対局 AI。
 * (view, actions, level) の純粋関数で、卓の公開情報と自分の手牌のみから
 * 決定的に行動を選ぶ(乱数・時刻・全体状態は使わない)。
 *
 * レベル別方針(docs/spec-phase1.md「CPU 対局 AI」):
 * - 入門: シャンテン数を維持する打牌(同値なら字牌→么九牌→孤立牌から切る)。
 *         鳴きは役牌ポンのみ。テンパイしたら常にリーチ。和了は常に宣言
 * - 標準: 入門に加え受け入れ枚数(見えていない残り枚数)で打牌を選ぶ。
 *         タンヤオ・役牌の芽がありシャンテン数が進む鳴きのみ行う。
 *         他家リーチ時に自手が2シャンテン以上なら現物を優先して降りる
 * - 上級: 標準に加えドラ・赤5を残す打点効率と、現物→スジ→字牌の降り判断
 */

const sameKind = (a: Tile, b: Tile): boolean =>
  Tile.toIndex(a) === Tile.toIndex(b);

const removeFirst = (tiles: readonly Tile[], tile: Tile): readonly Tile[] => {
  const index = tiles.indexOf(tile);
  return index === -1
    ? tiles
    : [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

const ownTiles = (view: PlayerView): readonly Tile[] =>
  view.ownDrawn === null ? view.ownHand : [...view.ownHand, view.ownDrawn];

const ownMelds = (view: PlayerView): readonly Meld[] =>
  view.players[view.seat].melds.map((gameMeld) => gameMeld.meld);

/** 1回の意思決定内でのシャンテン数キャッシュ(呼び出しを跨いで状態を持たない) */
type ShantenCache = Map<string, number>;

const shantenOf = (
  cache: ShantenCache,
  tiles: readonly Tile[],
  melds: readonly Meld[],
): number => {
  const key = `${[...tiles].map(Tile.normalize).sort().join(",")}|${melds.length}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = Hand.shanten(Hand.create(tiles, melds));
  cache.set(key, value);
  return value;
};

/** 見えている牌(自手・全員の河・副露・ドラ表示牌)の種類別枚数 */
const visibleCounts = (view: PlayerView): readonly number[] => {
  const tiles: Tile[] = [...ownTiles(view), ...view.doraIndicators];
  for (const player of view.players) {
    for (const entry of player.discards) {
      tiles.push(entry.tile);
    }
    for (const gameMeld of player.melds) {
      tiles.push(...gameMeld.meld.tiles);
    }
  }
  return Tile.toCounts(tiles);
};

const liveCount = (visible: readonly number[], tile: Tile): number =>
  Math.max(0, 4 - visible[Tile.toIndex(tile)]);

/** ドラ表示牌が示すドラの種類インデックス */
const doraKinds = (view: PlayerView): ReadonlySet<number> =>
  new Set(
    view.doraIndicators.map((indicator) =>
      Tile.toIndex(Tile.indicatedDora(indicator)),
    ),
  );

/** 自手(副露込み)のドラ+赤5の枚数(リーチ判断の簡易打点評価) */
const ownDoraCount = (view: PlayerView): number => {
  const kinds = doraKinds(view);
  const tiles = [
    ...ownTiles(view),
    ...ownMelds(view).flatMap((meld) => meld.tiles),
  ];
  return tiles.filter(
    (tile) => kinds.has(Tile.toIndex(tile)) || Tile.isRed(tile),
  ).length;
};

const isYakuhaiFor = (view: PlayerView, tile: Tile): boolean =>
  Tile.isDragon(tile) ||
  (Tile.isWind(tile) &&
    (tile === view.seatWind || tile === view.round.wind));

/** 暗槓してもシャンテン数が悪化しないか */
const ankanKeepsShanten = (
  view: PlayerView,
  kind: Tile,
  cache: ShantenCache,
): boolean => {
  const tiles = ownTiles(view);
  const melds = ownMelds(view);
  const before = shantenOf(cache, tiles, melds);
  const rest = tiles.filter((tile) => !sameKind(tile, kind));
  const group = tiles.filter((tile) => sameKind(tile, kind));
  const after = shantenOf(cache, rest, [
    ...melds,
    { type: "ankan", tiles: group },
  ]);
  return after <= before;
};

/** リーチ宣言牌の候補から、待ちの残り枚数が最大のものを選ぶ */
const bestRiichiDiscard = (
  view: PlayerView,
  actions: TurnActions,
): Readonly<{ tile: Tile; liveWaits: number }> => {
  const tiles = ownTiles(view);
  const melds = ownMelds(view);
  const visible = visibleCounts(view);
  const evaluated = actions.riichiDiscards.map((candidate) => {
    const waits = Hand.waits(Hand.create(removeFirst(tiles, candidate), melds));
    const live = waits.reduce((sum, wait) => sum + liveCount(visible, wait), 0);
    return { tile: candidate, liveWaits: live };
  });
  return evaluated.reduce((best, current) =>
    current.liveWaits > best.liveWaits ? current : best,
  );
};

const shouldDeclareRiichi = (
  view: PlayerView,
  level: CpuLevel,
  liveWaits: number,
): boolean => {
  switch (level) {
    case "beginner":
      // テンパイしたら常に宣言
      return true;
    case "standard":
      // 待ちが良い(残り3枚以上)か、打点が低い(ドラ2未満)ならリーチで打点を作る
      return liveWaits >= 3 || ownDoraCount(view) < 2;
    case "advanced":
      // 待ちが完全に枯れているときだけ見送る
      return liveWaits > 0;
  }
};

/** スジ牌か(リーチ者の河にある牌のスジ) */
const isSujiSafe = (tile: Tile, discardedKinds: ReadonlySet<number>): boolean => {
  const suit = Tile.suitOf(tile);
  const number = Tile.numberOf(tile);
  if (suit === null || number === null) {
    return false;
  }
  const kindOf = (n: number): number => Tile.toIndex(`${n}${suit}` as Tile);
  if (number <= 3) {
    return discardedKinds.has(kindOf(number + 3));
  }
  if (number >= 7) {
    return discardedKinds.has(kindOf(number - 3));
  }
  return (
    discardedKinds.has(kindOf(number - 3)) &&
    discardedKinds.has(kindOf(number + 3))
  );
};

/**
 * 降り判断: 他家リーチかつ自手が2シャンテン以上のとき、
 * 現物(上級はさらにスジ→字牌)を返す。降りないときは null
 */
const defensiveDiscard = (
  view: PlayerView,
  actions: TurnActions,
  level: CpuLevel,
  cache: ShantenCache,
): Tile | null => {
  if (level === "beginner") {
    return null;
  }
  const threats = view.players.filter(
    (player, seat) => seat !== view.seat && player.riichi !== "none",
  );
  if (threats.length === 0) {
    return null;
  }
  if (shantenOf(cache, ownTiles(view), ownMelds(view)) < 2) {
    return null;
  }
  const safeKinds = new Set<number>(
    threats.flatMap((player) =>
      player.discards.map((entry) => Tile.toIndex(entry.tile)),
    ),
  );
  const genbutsu = actions.discards.find((tile) =>
    safeKinds.has(Tile.toIndex(tile)),
  );
  if (genbutsu !== undefined) {
    return genbutsu;
  }
  if (level === "advanced") {
    const suji = actions.discards.find((tile) => isSujiSafe(tile, safeKinds));
    if (suji !== undefined) {
      return suji;
    }
    const honor = actions.discards.find((tile) => Tile.isHonor(tile));
    if (honor !== undefined) {
      return honor;
    }
  }
  return null;
};

/** 孤立牌か(同種牌も周囲2以内の数牌もない) */
const isIsolated = (tile: Tile, rest: readonly Tile[]): boolean => {
  if (Tile.isHonor(tile)) {
    return !rest.some((other) => sameKind(other, tile));
  }
  const suit = Tile.suitOf(tile);
  const number = Tile.numberOf(tile);
  return !rest.some((other) => {
    if (Tile.suitOf(other) !== suit) {
      return false;
    }
    const otherNumber = Tile.numberOf(other);
    return otherNumber !== null && number !== null
      ? Math.abs(otherNumber - number) <= 2
      : false;
  });
};

type DiscardCandidate = Readonly<{
  tile: Tile;
  rest: readonly Tile[];
  shanten: number;
}>;

/** 入門の同値打牌選択: 字牌→么九牌→孤立牌→先頭 */
const beginnerPick = (candidates: readonly DiscardCandidate[]): Tile => {
  const rankOf = (candidate: DiscardCandidate): number => {
    if (Tile.isHonor(candidate.tile)) {
      return 0;
    }
    if (Tile.isTerminal(candidate.tile)) {
      return 1;
    }
    return isIsolated(candidate.tile, candidate.rest) ? 2 : 3;
  };
  return candidates.reduce((best, current) =>
    rankOf(current) < rankOf(best) ? current : best,
  ).tile;
};

/** 牌効率打牌: シャンテン数最小 → (標準以上)受け入れ最大 → (上級)ドラ・赤5を残す */
const efficientDiscard = (
  view: PlayerView,
  actions: TurnActions,
  level: CpuLevel,
  cache: ShantenCache,
): Tile => {
  const tiles = ownTiles(view);
  const melds = ownMelds(view);
  const evaluated: readonly DiscardCandidate[] = actions.discards.map(
    (tile) => {
      const rest = removeFirst(tiles, tile);
      return { tile, rest, shanten: shantenOf(cache, rest, melds) };
    },
  );
  const minShanten = Math.min(...evaluated.map((entry) => entry.shanten));
  const best = evaluated.filter((entry) => entry.shanten === minShanten);
  if (best.length === 1) {
    return best[0].tile;
  }
  // 序盤(3シャンテン以上)は受け入れ計算を省略して入門と同じ基準で選ぶ
  if (level === "beginner" || minShanten >= 3) {
    return beginnerPick(best);
  }
  const visible = visibleCounts(view);
  const withUkeire = best.map((entry) => {
    const improving = Hand.improvingTiles(Hand.create(entry.rest, melds));
    const ukeire = improving.reduce(
      (sum, tile) => sum + liveCount(visible, tile),
      0,
    );
    return { ...entry, ukeire };
  });
  const maxUkeire = Math.max(...withUkeire.map((entry) => entry.ukeire));
  const top = withUkeire.filter((entry) => entry.ukeire === maxUkeire);
  if (level === "advanced") {
    // 打点効率: ドラ・赤5は手に残す
    const kinds = doraKinds(view);
    const plain = top.find(
      (entry) =>
        !Tile.isRed(entry.tile) && !kinds.has(Tile.toIndex(entry.tile)),
    );
    if (plain !== undefined) {
      return plain.tile;
    }
  }
  return top[0].tile;
};

/**
 * 鳴き判断(標準・上級の簡易ヒューリスティック):
 * 手に役の芽(喰いタン可のタンヤオ形 / 役牌対子)があり、
 * 鳴くとシャンテン数が進む場合のみ鳴く
 */
const decideMeldClaim = (
  view: PlayerView,
  option: ClaimOption,
  discard: Tile,
): GameAction | null => {
  const seat = option.player;
  const tiles = view.ownHand;
  const melds = ownMelds(view);
  const cache: ShantenCache = new Map();
  const current = shantenOf(cache, tiles, melds);

  const meldTiles = melds.flatMap((meld) => meld.tiles);
  const tanyaoPath =
    view.rules.kuitan &&
    Tile.isSimple(discard) &&
    tiles.every(Tile.isSimple) &&
    meldTiles.every(Tile.isSimple);
  const yakuhaiPath = tiles.some(
    (tile) =>
      isYakuhaiFor(view, Tile.normalize(tile)) &&
      tiles.filter((other) => sameKind(other, tile)).length >= 2,
  );
  if (!tanyaoPath && !yakuhaiPath) {
    return null;
  }

  if (option.canPon) {
    const matched = tiles.filter((tile) => sameKind(tile, discard)).slice(0, 2);
    const rest = matched.reduce(removeFirst, tiles);
    const after = shantenOf(cache, rest, [
      ...melds,
      { type: "pon", tiles: [discard, ...matched] },
    ]);
    if (after < current) {
      return { type: "pon", player: seat };
    }
  }
  for (const pair of option.chiOptions) {
    const rest = removeFirst(removeFirst(tiles, pair[0]), pair[1]);
    const after = shantenOf(cache, rest, [
      ...melds,
      { type: "chi", tiles: [discard, pair[0], pair[1]] },
    ]);
    if (after < current) {
      return { type: "chi", player: seat, tiles: pair };
    }
  }
  return null;
};

export const Cpu = {
  /** 手番の行動決定。必ず actions に含まれる合法な行動を返す */
  decideTurn(
    view: PlayerView,
    actions: TurnActions,
    level: CpuLevel,
  ): GameAction {
    const seat = view.seat;
    if (actions.canTsumo) {
      return { type: "tsumo", player: seat };
    }
    const cache: ShantenCache = new Map();
    if (actions.ankanTiles.length > 0 && level !== "beginner") {
      const tile = actions.ankanTiles[0];
      const riichiLocked = view.players[seat].riichi !== "none";
      if (riichiLocked || ankanKeepsShanten(view, tile, cache)) {
        return { type: "ankan", player: seat, tile };
      }
    }
    if (actions.canRiichi) {
      const best = bestRiichiDiscard(view, actions);
      if (shouldDeclareRiichi(view, level, best.liveWaits)) {
        return { type: "discard", player: seat, tile: best.tile, riichi: true };
      }
    }
    if (actions.discards.length === 1) {
      return {
        type: "discard",
        player: seat,
        tile: actions.discards[0],
        riichi: false,
      };
    }
    const defensive = defensiveDiscard(view, actions, level, cache);
    if (defensive !== null) {
      return { type: "discard", player: seat, tile: defensive, riichi: false };
    }
    return {
      type: "discard",
      player: seat,
      tile: efficientDiscard(view, actions, level, cache),
      riichi: false,
    };
  },

  /** 他家の打牌・加槓への応答決定(ロン/ポン/カン/チー/パス) */
  decideClaim(
    view: PlayerView,
    option: ClaimOption,
    discard: Tile,
    level: CpuLevel,
  ): GameAction {
    const seat = option.player;
    if (option.canRon) {
      return { type: "ron", player: seat };
    }
    // 役牌は全レベルでポンする(明確に役に繋がる鳴き)
    if (option.canPon && isYakuhaiFor(view, Tile.normalize(discard))) {
      return { type: "pon", player: seat };
    }
    if (level !== "beginner") {
      const claim = decideMeldClaim(view, option, discard);
      if (claim !== null) {
        return claim;
      }
    }
    return { type: "pass", player: seat };
  },
} as const;
