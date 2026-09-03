import { Meld } from "@/src/domains/meld";
import type { ScoringInput } from "@/src/domains/scoring-input";
import type { Tile } from "@/src/domains/tile";

/**
 * 点数計算サービスのテスト用セットアップ。既定は「子(南家)・東場・ロン・リーチなし」。
 */
export const input = (overrides: Partial<ScoringInput> & Pick<ScoringInput, "hand" | "winTile">): ScoringInput => ({
  melds: [],
  winType: "ron",
  seatWind: "nan",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  honba: 0,
  kyotaku: 0,
  ...overrides,
});

const meld = (type: "chi" | "pon" | "kan" | "ankan", tiles: readonly Tile[]): Meld => {
  const created = Meld.create(type, tiles);
  if (created === undefined) throw new Error(`テスト用の副露が不正です: ${type} ${tiles.join(" ")}`);
  return created;
};

export const pon = (tile: Tile): Meld => meld("pon", [tile, tile, tile]);
export const chi = (a: Tile, b: Tile, c: Tile): Meld => meld("chi", [a, b, c]);
