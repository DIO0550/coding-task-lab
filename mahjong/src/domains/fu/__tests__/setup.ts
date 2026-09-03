import { Hand } from "@/src/domains/hand";
import { Meld } from "@/src/domains/meld";
import type { Tile } from "@/src/domains/tile";
import type { Wind } from "@/src/domains/wind";
import { WinningShape, type WaitType } from "@/src/domains/winning-shape";
import type { WinType } from "@/src/types/scoring";

import { Fu } from "..";

/**
 * 符計算テスト用のセットアップ。手牌から和了形を列挙し、`wait` 指定があればその待ちの解釈、
 * なければ唯一の解釈に対して符を求める。
 */
export type FuSetup = Readonly<{
  hand: readonly Tile[];
  melds?: readonly Meld[];
  winTile: Tile;
  winType?: WinType;
  seatWind?: Wind;
  roundWind?: Wind;
  hasPinfu?: boolean;
  wait?: WaitType;
}>;

export const fuOf = (setup: FuSetup): number => {
  const melds = setup.melds ?? [];
  const hand = Hand.create(setup.hand, melds);
  if (hand === undefined) throw new Error(`テスト用の手牌が不正です: ${setup.hand.join(" ")}`);
  const winType = setup.winType ?? "ron";
  const shapes = WinningShape.enumerate(hand, setup.winTile, winType).filter(
    (shape) => setup.wait === undefined || (shape.kind === "standard" && shape.wait === setup.wait),
  );
  if (shapes.length !== 1) throw new Error(`テスト用の手牌の解釈が一意ではありません(${shapes.length}件)`);
  return Fu.calculate(shapes[0], {
    hand,
    winType,
    seatWind: setup.seatWind ?? "nan",
    roundWind: setup.roundWind ?? "ton",
    hasPinfu: setup.hasPinfu ?? false,
  });
};

const meld = (type: "chi" | "pon" | "kan" | "ankan", tiles: readonly Tile[]): Meld => {
  const created = Meld.create(type, tiles);
  if (created === undefined) throw new Error(`テスト用の副露が不正です: ${type} ${tiles.join(" ")}`);
  return created;
};

export const pon = (tile: Tile): Meld => meld("pon", [tile, tile, tile]);
export const kan = (tile: Tile): Meld => meld("kan", [tile, tile, tile, tile]);
export const ankan = (tile: Tile): Meld => meld("ankan", [tile, tile, tile, tile]);
export const chi = (a: Tile, b: Tile, c: Tile): Meld => meld("chi", [a, b, c]);
