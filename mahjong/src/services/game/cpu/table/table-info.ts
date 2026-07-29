import { Hand } from "../../../../domains/hand/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import {
  MAX_TILE_DUPLICATES,
  TileCounts,
} from "../../../../domains/tile-counts/index.ts";
import { Wind } from "../../../../domains/wind/index.ts";
import type { PlayerView } from "../../view/index.ts";

/**
 * 卓の公開情報と自分の手牌だけから作る、行動決定用の集計。
 * 他家の手牌や山の中身は一切参照しない。
 */
export type TableInfo = Readonly<{
  /** 集計の視点となる席。 */
  seat: number;
  /** 見えている牌の枚数(自分の手牌・全員の河・全員の副露・ドラ表示牌)。 */
  visible: TileCounts;
  /** 現在のドラ(牌種)。 */
  dora: readonly Tile[];
  /** リーチしている他家の席。 */
  threats: readonly number[];
  /** 自分にとっての役牌(三元牌・場風牌・自風牌)。 */
  valueTiles: readonly Tile[];
}>;

const ownTiles = (view: PlayerView): readonly Tile[] =>
  Hand.allTiles(view.hand);

/** 他家の副露牌。自分の副露は手牌側から数えるため除く。 */
const otherMeldTiles = (view: PlayerView): readonly Tile[] =>
  view.melds.flatMap((melds, seat) =>
    seat === view.seat ? [] : melds.flatMap((meld) => meld.tiles),
  );

/** 河の牌。鳴かれた牌は副露として数えるため除く。 */
const riverTiles = (view: PlayerView): readonly Tile[] =>
  view.rivers.flatMap((river) =>
    river.discards.flatMap((discard) =>
      discard.called ? [] : [discard.tile],
    ),
  );

const visibleTiles = (view: PlayerView): readonly Tile[] => [
  ...ownTiles(view),
  ...otherMeldTiles(view),
  ...riverTiles(view),
  ...view.doraIndicators,
];

const threatSeats = (view: PlayerView): readonly number[] =>
  view.riichi.flatMap((declared, seat) =>
    declared && seat !== view.seat ? [seat] : [],
  );

const distinctKinds = (tiles: readonly Tile[]): readonly Tile[] =>
  tiles.filter(
    (tile, position) =>
      tiles.findIndex((other) => Tile.isSameKind(other, tile)) === position,
  );

const valueTilesOf = (view: PlayerView): readonly Tile[] =>
  distinctKinds([
    Wind.toTile(view.roundWind),
    Wind.toTile(view.seatWinds[view.seat]),
    ...Tile.allKinds().filter((tile) => Tile.isDragon(tile)),
  ]);

export const TableInfo = {
  /** 視点となるプレイヤーから見た公開情報の集計。 */
  create(view: PlayerView): TableInfo {
    return {
      seat: view.seat,
      visible: TileCounts.fromTiles(visibleTiles(view)),
      dora: view.doraIndicators.map((indicator) =>
        Tile.doraFromIndicator(indicator),
      ),
      threats: threatSeats(view),
      valueTiles: valueTilesOf(view),
    };
  },

  /** 見えている枚数。 */
  visibleCount(info: TableInfo, tile: Tile): number {
    return info.visible[Tile.toIndex(tile)];
  },

  /** まだ見えていない枚数。 */
  remaining(info: TableInfo, tile: Tile): number {
    return Math.max(
      0,
      MAX_TILE_DUPLICATES - TableInfo.visibleCount(info, tile),
    );
  },

  /** ドラ(赤ドラを含む)か。 */
  isDora(info: TableInfo, tile: Tile): boolean {
    return (
      tile.red || info.dora.some((dora) => Tile.isSameKind(dora, tile))
    );
  },

  /** ドラ(赤ドラを含む)の枚数。 */
  doraCount(info: TableInfo, tiles: readonly Tile[]): number {
    return tiles.filter((tile) => TableInfo.isDora(info, tile)).length;
  },

  /** 役牌(三元牌・場風牌・自風牌)か。 */
  isValueTile(info: TableInfo, tile: Tile): boolean {
    return info.valueTiles.some((value) => Tile.isSameKind(value, tile));
  },

  /** リーチしている他家がいるか。 */
  hasThreat(info: TableInfo): boolean {
    return info.threats.length > 0;
  },
} as const;
