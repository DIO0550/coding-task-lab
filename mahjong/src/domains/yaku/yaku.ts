import { Hand } from "@/src/domains/hand";
import { ScoringInput } from "@/src/domains/scoring-input";
import { Tile } from "@/src/domains/tile";
import type { Mentsu, StandardShape, WinningShape } from "@/src/domains/winning-shape";
import type { ScoringRules, YakuHan, YakuName } from "@/src/types/scoring";

/**
 * 役判定。
 *
 * 契約:
 * - 和了形の解釈1つ(`shape`)と文脈から、成立する役をすべて返す
 * - 役満が1つでも成立する場合は役満(13翻)/ダブル役満(26翻)のみを返し、通常役・ドラは含めない。
 *   役満の複合は合計26翻(ダブル役満)を上限とし、上限を超える役満は一覧から除く
 * - ドラ(dora / ura_dora / aka_dora)は役が1つ以上ある場合のみ末尾に付与する。役がなければ空配列を返す
 * - 喰い下がりは `han` に反映済みの値を返す(例: 副露した三色同順は 1)
 * - `rules.kuitan` が false なら副露した断么九は成立しない
 * - `rules.atozuke` が false なら、副露した手で和了牌を含む刻子によって初めて成立する役牌のみの手は役なしとする
 * - 返す順序は役の一覧順(リーチ系 → 門前ツモ → 平和 → … → 清一色)、その後にドラ
 */
export type YakuContext = Readonly<{
  hand: Hand;
  input: ScoringInput;
  rules: ScoringRules;
}>;

type Detector = (shape: WinningShape, context: YakuContext) => readonly YakuHan[];

const YAKUMAN_HAN = 13;
const DOUBLE_YAKUMAN_HAN = 26;
const NONE: readonly YakuHan[] = [];

const one = (name: YakuName, han: number): readonly YakuHan[] => [{ name, han }];

const when = (condition: boolean, name: YakuName, han: number): readonly YakuHan[] =>
  condition ? one(name, han) : NONE;

const sumHan = (entries: readonly YakuHan[]): number => entries.reduce((total, entry) => total + entry.han, 0);

// --- 文脈・形の補助 ---

const isMenzen = (context: YakuContext): boolean => Hand.isMenzen(context.hand);

const tilesOf = (context: YakuContext): readonly Tile[] =>
  Hand.allTiles(context.hand).map((tile) => Tile.normalize(tile));

const kuisagari = (context: YakuContext, closed: number, open: number): number =>
  isMenzen(context) ? closed : open;

const asStandard = (shape: WinningShape): StandardShape | undefined =>
  shape.kind === "standard" ? shape : undefined;

const shuntsuOf = (shape: StandardShape): readonly Mentsu[] => shape.mentsu.filter((m) => m.type === "shuntsu");

const tripletsOf = (shape: StandardShape): readonly Mentsu[] => shape.mentsu.filter((m) => m.type !== "shuntsu");

const kantsuOf = (shape: StandardShape): readonly Mentsu[] => shape.mentsu.filter((m) => m.type === "kantsu");

const headOf = (mentsu: Mentsu): Tile => mentsu.tiles[0];

const seatTile = (context: YakuContext): Tile => Tile.ofWind(context.input.seatWind);

const roundTile = (context: YakuContext): Tile => Tile.ofWind(context.input.roundWind);

const isYakuhaiTile = (tile: Tile, context: YakuContext): boolean =>
  Tile.isDragon(tile) || Tile.equals(tile, seatTile(context)) || Tile.equals(tile, roundTile(context));

const hasTriplet = (shape: StandardShape, tile: Tile): boolean =>
  tripletsOf(shape).some((mentsu) => Tile.equals(headOf(mentsu), tile));

/** 同一順子の組数(一盃口=1、二盃口=2) */
const peikouCount = (shape: StandardShape): number => {
  const keys = shuntsuOf(shape).map((mentsu) => mentsu.tiles.join(","));
  return [...new Set(keys)].reduce(
    (total, key) => total + Math.floor(keys.filter((candidate) => candidate === key).length / 2),
    0,
  );
};

/** 萬子・筒子・索子で同じ数から始まる面子が揃っているか(三色同順・三色同刻) */
const spansThreeSuits = (groups: readonly Mentsu[]): boolean => {
  const heads = groups.map(headOf).filter((tile) => !Tile.isHonor(tile));
  return heads.some(
    (head) =>
      Tile.suit(head) === "m" &&
      (["p", "s"] as const).every((suit) =>
        heads.some((other) => Tile.suit(other) === suit && Tile.rank(other) === Tile.rank(head)),
      ),
  );
};

const hasIttsu = (shape: StandardShape): boolean =>
  (["m", "p", "s"] as const).some((suit) =>
    [1, 4, 7].every((start) =>
      shuntsuOf(shape).some((mentsu) => Tile.suit(headOf(mentsu)) === suit && Tile.rank(headOf(mentsu)) === start),
    ),
  );

const everyGroupHasYaochu = (shape: StandardShape): boolean =>
  shape.mentsu.every((mentsu) => mentsu.tiles.some((tile) => Tile.isYaochu(tile))) && Tile.isYaochu(shape.pair);

const suitsOf = (context: YakuContext): ReadonlySet<string> => new Set(tilesOf(context).map((tile) => Tile.suit(tile)));

const isSingleSuit = (context: YakuContext): boolean =>
  [...suitsOf(context)].filter((suit) => suit !== "z").length === 1;

const hasHonor = (context: YakuContext): boolean => suitsOf(context).has("z");

const countBy = (tiles: readonly Tile[], predicate: (tile: Tile) => boolean): number =>
  tiles.filter(predicate).length;

// --- 通常役 ---

const riichi: Detector = (_shape, context) => {
  const status = context.input.riichi;
  if (status === "double") return one("double_riichi", 2);
  return when(status === "riichi", "riichi", 1);
};

const ippatsu: Detector = (_shape, context) =>
  when(context.input.ippatsu && context.input.riichi !== "none", "ippatsu", 1);

const menzenTsumo: Detector = (_shape, context) =>
  when(context.input.winType === "tsumo" && isMenzen(context), "menzen_tsumo", 1);

const pinfu: Detector = (shape, context) => {
  const standard = asStandard(shape);
  if (standard === undefined || !isMenzen(context)) return NONE;
  const allShuntsu = shuntsuOf(standard).length === 4;
  return when(allShuntsu && standard.wait === "ryanmen" && !isYakuhaiTile(standard.pair, context), "pinfu", 1);
};

const tanyao: Detector = (_shape, context) => {
  const allSimple = tilesOf(context).every((tile) => Tile.isSimple(tile));
  return when(allSimple && (isMenzen(context) || context.rules.kuitan), "tanyao", 1);
};

const iipeikou: Detector = (shape, context) => {
  const standard = asStandard(shape);
  if (standard === undefined || !isMenzen(context)) return NONE;
  return when(peikouCount(standard) === 1, "iipeikou", 1);
};

const dragonYakuhai =
  (tile: Tile, name: YakuName): Detector =>
  (shape) => {
    const standard = asStandard(shape);
    return when(standard !== undefined && hasTriplet(standard, tile), name, 1);
  };

const seatWind: Detector = (shape, context) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && hasTriplet(standard, seatTile(context)), "seat_wind", 1);
};

const roundWind: Detector = (shape, context) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && hasTriplet(standard, roundTile(context)), "round_wind", 1);
};

const situational =
  (flag: "haitei" | "houtei" | "rinshan" | "chankan", winType: "tsumo" | "ron"): Detector =>
  (_shape, context) =>
    when(context.input.winType === winType && ScoringInput.has(context.input, flag), flag, 1);

const chiitoitsu: Detector = (shape) => when(shape.kind === "chiitoi", "chiitoitsu", 2);

const toitoi: Detector = (shape) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && tripletsOf(standard).length === 4, "toitoi", 2);
};

const sanankou: Detector = (shape) => {
  const standard = asStandard(shape);
  if (standard === undefined) return NONE;
  return when(tripletsOf(standard).filter((mentsu) => !mentsu.open).length === 3, "sanankou", 2);
};

const sanshokuDoukou: Detector = (shape) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && spansThreeSuits(tripletsOf(standard)), "sanshoku_doukou", 2);
};

const sankantsu: Detector = (shape) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && kantsuOf(standard).length === 3, "sankantsu", 2);
};

const honroutou: Detector = (shape, context) => {
  const allYaochu = tilesOf(context).every((tile) => Tile.isYaochu(tile));
  return when(allYaochu && shape.kind !== "kokushi", "honroutou", 2);
};

const shousangen: Detector = (shape) => {
  const standard = asStandard(shape);
  if (standard === undefined) return NONE;
  const dragonTriplets = tripletsOf(standard).filter((mentsu) => Tile.isDragon(headOf(mentsu))).length;
  return when(dragonTriplets === 2 && Tile.isDragon(standard.pair), "shousangen", 2);
};

const sanshoku: Detector = (shape, context) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && spansThreeSuits(shuntsuOf(standard)), "sanshoku", kuisagari(context, 2, 1));
};

const ittsu: Detector = (shape, context) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && hasIttsu(standard), "ittsu", kuisagari(context, 2, 1));
};

const chantaLike = (shape: WinningShape): boolean => {
  const standard = asStandard(shape);
  return standard !== undefined && shuntsuOf(standard).length > 0 && everyGroupHasYaochu(standard);
};

const chanta: Detector = (shape, context) =>
  when(chantaLike(shape) && hasHonor(context), "chanta", kuisagari(context, 2, 1));

const honitsu: Detector = (_shape, context) =>
  when(isSingleSuit(context) && hasHonor(context), "honitsu", kuisagari(context, 3, 2));

const junchan: Detector = (shape, context) =>
  when(chantaLike(shape) && !hasHonor(context), "junchan", kuisagari(context, 3, 2));

const ryanpeikou: Detector = (shape, context) => {
  const standard = asStandard(shape);
  if (standard === undefined || !isMenzen(context)) return NONE;
  return when(peikouCount(standard) === 2, "ryanpeikou", 3);
};

const chinitsu: Detector = (_shape, context) =>
  when(isSingleSuit(context) && !hasHonor(context), "chinitsu", kuisagari(context, 6, 5));

const NORMAL_DETECTORS: readonly Detector[] = [
  riichi,
  ippatsu,
  menzenTsumo,
  pinfu,
  tanyao,
  iipeikou,
  dragonYakuhai("haku", "haku"),
  dragonYakuhai("hatsu", "hatsu"),
  dragonYakuhai("chun", "chun"),
  seatWind,
  roundWind,
  situational("haitei", "tsumo"),
  situational("houtei", "ron"),
  situational("rinshan", "tsumo"),
  situational("chankan", "ron"),
  chiitoitsu,
  toitoi,
  sanankou,
  sanshokuDoukou,
  sankantsu,
  honroutou,
  shousangen,
  sanshoku,
  ittsu,
  chanta,
  honitsu,
  junchan,
  ryanpeikou,
  chinitsu,
];

// --- 役満 ---

const kokushi: Detector = (shape) => {
  if (shape.kind !== "kokushi") return NONE;
  return shape.thirteenWait ? one("kokushi_musou_13", DOUBLE_YAKUMAN_HAN) : one("kokushi_musou", YAKUMAN_HAN);
};

const suuankou: Detector = (shape) => {
  const standard = asStandard(shape);
  if (standard === undefined || tripletsOf(standard).filter((mentsu) => !mentsu.open).length !== 4) return NONE;
  return standard.wait === "tanki" ? one("suuankou_tanki", DOUBLE_YAKUMAN_HAN) : one("suuankou", YAKUMAN_HAN);
};

const daisangen: Detector = (shape) => {
  const standard = asStandard(shape);
  if (standard === undefined) return NONE;
  const dragons = tripletsOf(standard).filter((mentsu) => Tile.isDragon(headOf(mentsu))).length;
  return when(dragons === 3, "daisangen", YAKUMAN_HAN);
};

const suushii: Detector = (shape) => {
  const standard = asStandard(shape);
  if (standard === undefined) return NONE;
  const winds = tripletsOf(standard).filter((mentsu) => Tile.isWind(headOf(mentsu))).length;
  if (winds === 4) return one("daisuushii", DOUBLE_YAKUMAN_HAN);
  return when(winds === 3 && Tile.isWind(standard.pair), "shousuushii", YAKUMAN_HAN);
};

const tsuuiisou: Detector = (shape, context) =>
  when(shape.kind !== "kokushi" && tilesOf(context).every((tile) => Tile.isHonor(tile)), "tsuuiisou", YAKUMAN_HAN);

const chinroutou: Detector = (shape, context) =>
  when(shape.kind === "standard" && tilesOf(context).every((tile) => Tile.isTerminal(tile)), "chinroutou", YAKUMAN_HAN);

const ryuuiisou: Detector = (shape, context) =>
  when(shape.kind !== "kokushi" && tilesOf(context).every((tile) => Tile.isGreen(tile)), "ryuuiisou", YAKUMAN_HAN);

/** 九蓮宝燈の純正形(1112345678999)の各数の枚数 */
const CHUUREN_PURE: readonly number[] = [3, 1, 1, 1, 1, 1, 1, 1, 3];

const matchesChuuren = (tiles: readonly Tile[], allowExtra: boolean): boolean =>
  CHUUREN_PURE.every((required, index) => {
    const actual = countBy(tiles, (tile) => Tile.rank(tile) === index + 1);
    return allowExtra ? actual >= required : actual === required;
  });

const chuuren: Detector = (shape, context) => {
  const standard = asStandard(shape);
  if (standard === undefined || !isMenzen(context) || !isSingleSuit(context) || hasHonor(context)) return NONE;
  const all = tilesOf(context);
  if (all.length !== 14 || !matchesChuuren(all, true)) return NONE;
  const pure = matchesChuuren(Tile.removeOne(all, Tile.normalize(context.input.winTile)), false);
  return pure ? one("junsei_chuuren_poutou", DOUBLE_YAKUMAN_HAN) : one("chuuren_poutou", YAKUMAN_HAN);
};

const suukantsu: Detector = (shape) => {
  const standard = asStandard(shape);
  return when(standard !== undefined && kantsuOf(standard).length === 4, "suukantsu", YAKUMAN_HAN);
};

const tenhou: Detector = (_shape, context) =>
  when(
    context.input.winType === "tsumo" && ScoringInput.has(context.input, "tenhou") && ScoringInput.isDealer(context.input),
    "tenhou",
    YAKUMAN_HAN,
  );

const chihou: Detector = (_shape, context) =>
  when(
    context.input.winType === "tsumo" && ScoringInput.has(context.input, "chihou") && !ScoringInput.isDealer(context.input),
    "chihou",
    YAKUMAN_HAN,
  );

const YAKUMAN_DETECTORS: readonly Detector[] = [
  kokushi,
  suuankou,
  daisangen,
  suushii,
  tsuuiisou,
  chinroutou,
  ryuuiisou,
  chuuren,
  suukantsu,
  tenhou,
  chihou,
];

/** 合計がダブル役満(26翻)を超えないよう、一覧順に収まる役満だけを残す */
const capYakuman = (entries: readonly YakuHan[]): readonly YakuHan[] =>
  entries.reduce<readonly YakuHan[]>(
    (kept, entry) => (sumHan(kept) + entry.han <= DOUBLE_YAKUMAN_HAN ? [...kept, entry] : kept),
    [],
  );

// --- ドラ ---

const doraYaku = (context: YakuContext): readonly YakuHan[] => {
  const tiles = Hand.allTiles(context.hand);
  const count = (doras: readonly Tile[]): number =>
    doras.reduce((total, dora) => total + Tile.countOf(tiles, dora), 0);
  const dora = count(context.input.dora);
  const ura = context.input.riichi === "none" ? 0 : count(context.input.uraDora);
  const aka = Hand.redCount(context.hand);
  return [...when(dora > 0, "dora", dora), ...when(ura > 0, "ura_dora", ura), ...when(aka > 0, "aka_dora", aka)];
};

// --- 後付け ---

const yakuhaiTileOf = (name: YakuName, context: YakuContext): Tile | undefined => {
  switch (name) {
    case "haku":
    case "hatsu":
    case "chun":
      return name;
    case "seat_wind":
      return seatTile(context);
    case "round_wind":
      return roundTile(context);
    default:
      return undefined;
  }
};

const winningKoutsuTile = (shape: WinningShape): Tile | undefined => {
  const standard = asStandard(shape);
  if (standard === undefined || standard.winMentsuIndex === undefined) return undefined;
  const mentsu = standard.mentsu[standard.winMentsuIndex];
  return mentsu.type === "koutsu" ? headOf(mentsu) : undefined;
};

/** 後付けなしのとき、副露した手で和了牌の刻子によって初めて成立する役牌しか役がなければ違反 */
const violatesAtozuke = (shape: WinningShape, context: YakuContext, entries: readonly YakuHan[]): boolean => {
  if (context.rules.atozuke || isMenzen(context)) return false;
  const winTile = winningKoutsuTile(shape);
  if (winTile === undefined) return false;
  return entries.every((entry) => {
    const tile = yakuhaiTileOf(entry.name, context);
    return tile !== undefined && Tile.equals(tile, winTile);
  });
};

export const Yaku = {
  detect(shape: WinningShape, context: YakuContext): readonly YakuHan[] {
    const yakuman = capYakuman(YAKUMAN_DETECTORS.flatMap((detector) => detector(shape, context)));
    if (yakuman.length > 0) return yakuman;
    const normal = NORMAL_DETECTORS.flatMap((detector) => detector(shape, context));
    if (normal.length === 0 || violatesAtozuke(shape, context, normal)) return NONE;
    return [...normal, ...doraYaku(context)];
  },
} as const;
