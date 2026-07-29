import type { Tile } from "../../../domains/tile/index.ts";

/** プレイヤーが選択できる行動。 */
export type GameAction =
  | Readonly<{ type: "discard"; index: number }>
  | Readonly<{ type: "riichi"; index: number }>
  | Readonly<{ type: "tsumo" }>
  | Readonly<{ type: "ankan"; tile: Tile }>
  | Readonly<{ type: "kakan"; tile: Tile }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "pon"; tiles: readonly Tile[] }>
  | Readonly<{ type: "minkan"; tiles: readonly Tile[] }>
  | Readonly<{ type: "chi"; tiles: readonly Tile[] }>
  | Readonly<{ type: "pass" }>;

/** 行動の種別。 */
export type GameActionType = GameAction["type"];

const CLAIM_TYPES: readonly GameActionType[] = [
  "ron",
  "pon",
  "minkan",
  "chi",
  "pass",
];

export const GameAction = {
  /** 打牌(純手牌の位置を指定)。 */
  discard(index: number): GameAction {
    return { type: "discard", index };
  },

  /** リーチ宣言(捨てる牌の位置を指定)。 */
  riichi(index: number): GameAction {
    return { type: "riichi", index };
  },

  /** ツモ和了。 */
  tsumo(): GameAction {
    return { type: "tsumo" };
  },

  /** 暗槓。 */
  ankan(tile: Tile): GameAction {
    return { type: "ankan", tile };
  },

  /** 加槓。 */
  kakan(tile: Tile): GameAction {
    return { type: "kakan", tile };
  },

  /** ロン和了。 */
  ron(): GameAction {
    return { type: "ron" };
  },

  /** ポン(使用する純手牌2枚を指定)。 */
  pon(tiles: readonly Tile[]): GameAction {
    return { type: "pon", tiles };
  },

  /** 大明槓(使用する純手牌3枚を指定)。 */
  minkan(tiles: readonly Tile[]): GameAction {
    return { type: "minkan", tiles };
  },

  /** チー(使用する純手牌2枚を指定)。 */
  chi(tiles: readonly Tile[]): GameAction {
    return { type: "chi", tiles };
  },

  /** 見送り。 */
  pass(): GameAction {
    return { type: "pass" };
  },

  /** 他家の打牌に対する応答か。 */
  isClaim(action: GameAction): boolean {
    return CLAIM_TYPES.includes(action.type);
  },

  /** 和了宣言か。 */
  isWin(action: GameAction): boolean {
    return action.type === "tsumo" || action.type === "ron";
  },

  /** 一覧から指定種別の行動を取り出す。 */
  filter(
    actions: readonly GameAction[],
    type: GameActionType,
  ): readonly GameAction[] {
    return actions.filter((action) => action.type === type);
  },

  /** 指定種別の行動が含まれるか。 */
  includes(actions: readonly GameAction[], type: GameActionType): boolean {
    return actions.some((action) => action.type === type);
  },
} as const;
