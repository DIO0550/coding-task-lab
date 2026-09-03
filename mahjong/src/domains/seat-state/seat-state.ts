import { Meld } from "@/src/domains/meld";
import type { SeatIndex } from "@/src/domains/seat";
import { Tile } from "@/src/domains/tile";
import { WinningShape } from "@/src/domains/winning-shape";
import type { RiichiStatus } from "@/src/types/scoring";

/**
 * 1局の中での各席の状態(手牌・副露・河・リーチ・フリテン)。持ち点は局をまたぐため GameState が持つ。
 * `hand` は整列済みの純手牌(13枚相当)、`drawnTile` はツモ牌。副露直後は `drawnTile` が null のまま打牌する。
 */
export type RiverTile = Readonly<{
  tile: Tile;
  isRiichi: boolean;
  /** 他家に鳴かれた場合、その席 */
  calledBy: SeatIndex | null;
}>;

export type SeatState = Readonly<{
  hand: readonly Tile[];
  drawnTile: Tile | null;
  melds: readonly Meld[];
  river: readonly RiverTile[];
  riichi: RiichiStatus;
  /** 一発の有効期間中かどうか */
  ippatsu: boolean;
  /** リーチ後に和了牌を見逃したことによる永続フリテン */
  permanentFuriten: boolean;
  /** ロンを見逃した同巡内のフリテン(自分の次の打牌で解除) */
  temporaryFuriten: boolean;
  hasDiscarded: boolean;
}>;

export type TilePair = readonly [Tile, Tile];

const CHI_PATTERNS: readonly (readonly [number, number])[] = [
  [-2, -1],
  [-1, 1],
  [1, 2],
];

/** 手牌にある同種牌の表記違い(赤5と通常5)を重複なく取り出す */
const variantsOf = (tiles: readonly Tile[], target: Tile): readonly Tile[] =>
  [...new Set(tiles.filter((tile) => Tile.equals(tile, target)))];

const pairsOfSameKind = (tiles: readonly Tile[], target: Tile): readonly TilePair[] => {
  const same = tiles.filter((tile) => Tile.equals(tile, target));
  const variants = [...new Set(same)];
  return variants.flatMap((a, i) =>
    variants
      .slice(i)
      .filter((b) => a !== b || same.filter((tile) => tile === a).length >= 2)
      .map((b): TilePair => [a, b]),
  );
};

const removeAll = (tiles: readonly Tile[], targets: readonly Tile[]): readonly Tile[] | undefined =>
  targets.reduce<readonly Tile[] | undefined>((rest, target) => {
    if (rest === undefined) return undefined;
    const removed = Tile.removeOne(rest, target);
    return removed.length === rest.length ? undefined : removed;
  }, tiles);

const lastRiver = (river: readonly RiverTile[], patch: Partial<RiverTile>): readonly RiverTile[] =>
  river.map((entry, index) => (index === river.length - 1 ? { ...entry, ...patch } : entry));

export const SeatState = {
  create(hand: readonly Tile[]): SeatState {
    return {
      hand: Tile.sort(hand),
      drawnTile: null,
      melds: [],
      river: [],
      riichi: "none",
      ippatsu: false,
      permanentFuriten: false,
      temporaryFuriten: false,
      hasDiscarded: false,
    };
  },

  /** 純手牌とツモ牌を合わせた手牌 */
  concealed(state: SeatState): readonly Tile[] {
    return state.drawnTile === null ? state.hand : [...state.hand, state.drawnTile];
  },

  draw(state: SeatState, tile: Tile): SeatState {
    return { ...state, drawnTile: tile };
  },

  /** 打牌。手牌に無い牌なら undefined。ツモ牌は手牌に組み込まれ、同巡フリテンと一発は解除される */
  discard(state: SeatState, tile: Tile): SeatState | undefined {
    const concealed = SeatState.concealed(state);
    const rest = Tile.removeOne(concealed, tile);
    if (rest.length === concealed.length) return undefined;
    return {
      ...state,
      hand: Tile.sort(rest),
      drawnTile: null,
      river: [...state.river, { tile, isRiichi: false, calledBy: null }],
      ippatsu: false,
      temporaryFuriten: false,
      hasDiscarded: true,
    };
  },

  /** 直前の打牌をリーチ宣言牌として扱い、リーチ状態と一発の期間を開始する */
  declareRiichi(state: SeatState, isDouble: boolean): SeatState {
    return {
      ...state,
      riichi: isDouble ? "double" : "riichi",
      ippatsu: true,
      river: lastRiver(state.river, { isRiichi: true }),
    };
  },

  clearIppatsu(state: SeatState): SeatState {
    return state.ippatsu ? { ...state, ippatsu: false } : state;
  },

  /** 直前の打牌が他家に鳴かれた */
  markCalled(state: SeatState, calledBy: SeatIndex): SeatState {
    return { ...state, river: lastRiver(state.river, { calledBy }) };
  },

  /** 手牌(ツモ牌含む)から指定の牌を取り除いて副露を追加する。牌が足りなければ undefined */
  meld(state: SeatState, tilesFromHand: readonly Tile[], meld: Meld): SeatState | undefined {
    const rest = removeAll(SeatState.concealed(state), tilesFromHand);
    if (rest === undefined) return undefined;
    return { ...state, hand: Tile.sort(rest), drawnTile: null, melds: [...state.melds, meld] };
  },

  /** ポンを加槓へ変換し、加える牌を手牌から取り除く */
  addKan(state: SeatState, tile: Tile): SeatState | undefined {
    const index = state.melds.findIndex((meld) => meld.type === "pon" && Meld.contains(meld, tile));
    const rest = removeAll(SeatState.concealed(state), [tile]);
    const kan = index >= 0 ? Meld.addKan(state.melds[index], tile) : undefined;
    if (rest === undefined || kan === undefined) return undefined;
    return {
      ...state,
      hand: Tile.sort(rest),
      drawnTile: null,
      melds: state.melds.map((meld, i) => (i === index ? kan : meld)),
    };
  },

  /** 見逃しによるフリテン。リーチ中なら永続、そうでなければ同巡のみ */
  markMissedRon(state: SeatState): SeatState {
    return state.riichi === "none"
      ? { ...state, temporaryFuriten: true }
      : { ...state, permanentFuriten: true, temporaryFuriten: true };
  },

  isMenzen(state: SeatState): boolean {
    return state.melds.every((meld) => !Meld.isOpen(meld));
  },

  isRiichi(state: SeatState): boolean {
    return state.riichi !== "none";
  },

  /** 13枚相当の純手牌に対する待ち */
  waits(state: SeatState): readonly Tile[] {
    return WinningShape.waits(state.hand, state.melds.length);
  },

  isTenpai(state: SeatState): boolean {
    return WinningShape.isTenpai(state.hand, state.melds.length);
  },

  /** 自分の河に待ち牌がある、または見逃しによるフリテン */
  isFuriten(state: SeatState): boolean {
    if (state.permanentFuriten || state.temporaryFuriten) return true;
    const waits = SeatState.waits(state);
    return state.river.some((entry) => waits.some((wait) => Tile.equals(wait, entry.tile)));
  },

  riverTiles(state: SeatState): readonly Tile[] {
    return state.river.map((entry) => entry.tile);
  },

  countInConcealed(state: SeatState, tile: Tile): number {
    return Tile.countOf(SeatState.concealed(state), tile);
  },

  /** 暗槓できる牌(手牌+ツモ牌に4枚ある種類) */
  ankanCandidates(state: SeatState): readonly Tile[] {
    const concealed = SeatState.concealed(state);
    return Tile.kinds().filter((kind) => Tile.countOf(concealed, kind) === 4);
  },

  /** 加槓できる牌(ポンしている牌と同種の手牌) */
  kakanCandidates(state: SeatState): readonly Tile[] {
    const concealed = SeatState.concealed(state);
    return state.melds
      .filter((meld) => meld.type === "pon")
      .flatMap((meld) => variantsOf(concealed, meld.tiles[0]));
  },

  /** 指定牌をポンするときに手牌から出す2枚の組み合わせ(赤5の有無で区別) */
  ponOptions(state: SeatState, tile: Tile): readonly TilePair[] {
    return pairsOfSameKind(state.hand, tile);
  },

  /** 指定牌をチーするときに手牌から出す2枚の組み合わせ */
  chiOptions(state: SeatState, tile: Tile): readonly TilePair[] {
    if (Tile.isHonor(tile)) return [];
    const rank = Tile.rank(tile);
    const suit = Tile.suit(tile);
    return CHI_PATTERNS.filter(([low, high]) => rank + low >= 1 && rank + high <= 9).flatMap(([low, high]) => {
      const first = variantsOf(state.hand, `${rank + low}${suit}` as Tile);
      const second = variantsOf(state.hand, `${rank + high}${suit}` as Tile);
      return first.flatMap((a) => second.map((b): TilePair => [a, b]));
    });
  },

  canDaiminkan(state: SeatState, tile: Tile): boolean {
    return Tile.countOf(state.hand, tile) === 3;
  },
} as const;
