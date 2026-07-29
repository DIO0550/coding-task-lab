import { Block } from "../../../../domains/block/index.ts";
import { Hand } from "../../../../domains/hand/index.ts";
import { Meld } from "../../../../domains/meld/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import { Wait } from "../../../../domains/wait/index.ts";
import {
  WinContext,
  type RiichiState,
  type SituationalYaku,
  type WinType,
} from "../../../../domains/win-context/index.ts";
import { Wind } from "../../../../domains/wind/index.ts";
import { WinningForm } from "../../../../domains/winning-form/index.ts";
import { WinningHand } from "../../../../domains/winning-hand/index.ts";
import { Yaku, type YakuName } from "../../../../domains/yaku/index.ts";

/**
 * 役判定テスト用の和了手ファクトリ。
 * 実ドメインオブジェクト(Hand / WinningForm / Wait / WinContext)だけで和了手を組み立てる。
 */

/** 副露元の席(点数計算では区別しないため固定値)。 */
const FROM_SEAT = 1;

/** 国士無双は和了牌が完成させたブロックを持たない。 */
const NO_WIN_BLOCK = -1;

const tilesOf = (codes: string): readonly Tile[] =>
  Tile.fromCodes(codes.split(" ").filter((code) => code.length > 0)) ?? [];

/** `"pon chun chun chun"` `"chi 1m 2m 3m"` `"ankan 5s 5s 5s 5s"` 形式の副露表記。 */
const meldOf = (spec: string): Meld => {
  const [type, ...codes] = spec.split(" ");
  const tiles = tilesOf(codes.join(" "));
  if (type === "chi") {
    return Meld.chi(tiles, FROM_SEAT);
  }
  if (type === "pon") {
    return Meld.pon(tiles, FROM_SEAT);
  }
  if (type === "minkan") {
    return Meld.minkan(tiles, FROM_SEAT);
  }
  return Meld.ankan(tiles);
};

/** ブロックを `種別:先頭牌` 形式で表す(例: `run:1m` `triplet:ton` `pair:5p`)。 */
const blockLabel = (block: Block): string =>
  `${block.kind}:${Tile.toCode(Block.head(block))}`;

const labelsOf = (specs: readonly string[]): string =>
  [...specs].sort().join(" ");

const formLabel = (form: WinningForm): string =>
  labelsOf(form.blocks.map(blockLabel));

const pickForm = (
  forms: readonly WinningForm[],
  spec: string | undefined,
): WinningForm => {
  const wanted =
    spec === undefined
      ? undefined
      : labelsOf(spec.split(" ").filter((label) => label.length > 0));
  const found =
    wanted === undefined
      ? forms[0]
      : forms.find((form) => formLabel(form) === wanted);
  if (found === undefined) {
    throw new Error(`指定した和了形が存在しない: ${spec ?? "(解釈なし)"}`);
  }
  return found;
};

const pickWinBlockIndex = (
  form: WinningForm,
  winTile: Tile,
  spec: string | undefined,
): number => {
  const index = form.blocks.findIndex(
    (block) =>
      Block.contains(block, winTile) &&
      (spec === undefined || blockLabel(block) === spec),
  );
  if (index >= 0) {
    return index;
  }
  if (form.kind === "thirteen_orphans") {
    return NO_WIN_BLOCK;
  }
  throw new Error(`和了牌を含むブロックが無い: ${Tile.toCode(winTile)}`);
};

const waitOf = (form: WinningForm, index: number, winTile: Tile): Wait => {
  if (index === NO_WIN_BLOCK) {
    return "tanki";
  }
  const wait = Wait.of(form.blocks[index], winTile);
  if (wait === null) {
    throw new Error(`待ちの形を判定できない: ${Tile.toCode(winTile)}`);
  }
  return wait;
};

export type WinningHandSpec = Readonly<{
  /** 純手牌(和了牌を含む)。 */
  concealed: string;
  /** 副露(例: `"pon chun chun chun"`)。 */
  melds?: readonly string[];
  winTile: string;
  /** 既定は `"ron"`。 */
  winType?: WinType;
  /** 既定は南家。 */
  seatWind?: Wind;
  /** 既定は東場。 */
  roundWind?: Wind;
  riichi?: RiichiState;
  ippatsu?: boolean;
  situational?: readonly SituationalYaku[];
  /** ドラそのもの(表示牌ではない)。 */
  dora?: string;
  /** 採用する和了形(例: `"run:1m run:4m run:7m triplet:ton pair:5p"`)。省略時は最初の解釈。 */
  form?: string;
  /** 和了牌が完成させたブロック(例: `"pair:9m"`)。省略時は和了牌を含む最初のブロック。 */
  winBlock?: string;
}>;

/** 牌表記から和了手を組み立てる。 */
export const winningHandOf = (spec: WinningHandSpec): WinningHand => {
  const winTile = Tile.fromCode(spec.winTile);
  if (winTile === null) {
    throw new Error(`不正な和了牌: ${spec.winTile}`);
  }
  const hand = Hand.create(
    tilesOf(spec.concealed),
    (spec.melds ?? []).map(meldOf),
  );
  const form = pickForm(Hand.winningForms(hand), spec.form);
  const winBlockIndex = pickWinBlockIndex(form, winTile, spec.winBlock);
  const context = WinContext.create({
    winTile,
    winType: spec.winType ?? "ron",
    seatWind: spec.seatWind ?? "nan",
    roundWind: spec.roundWind ?? "ton",
    riichi: spec.riichi,
    ippatsu: spec.ippatsu,
    situational: spec.situational,
    dora: spec.dora === undefined ? undefined : tilesOf(spec.dora),
  });
  return WinningHand.create(
    hand,
    form,
    winBlockIndex,
    waitOf(form, winBlockIndex, winTile),
    context,
  );
};

/** 役名を昇順に並べて返す(出力順に依存しない検証のため)。 */
export const yakuNames = (yaku: readonly Yaku[]): readonly string[] =>
  [...yaku.map((entry) => entry.name)].sort();

/** 指定した役の翻数。成立していなければ 0。 */
export const hanOf = (yaku: readonly Yaku[], name: YakuName): number =>
  yaku.find((entry) => entry.name === name)?.han ?? 0;

/** 翻数の合計。 */
export const totalHan = (yaku: readonly Yaku[]): number => Yaku.totalHan(yaku);
