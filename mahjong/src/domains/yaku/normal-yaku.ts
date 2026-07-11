import { Tile } from "../tile/index.ts";
import type { WinContext, YakuResult } from "../win-context/index.ts";
import {
  allTiles,
  blocksOf,
  concealedTripletCount,
  isShuntsu,
  isTripletLike,
  shuntsuStartKeys,
  standardFormOf,
} from "./form-view.ts";
import type { Group, StandardForm } from "./form-view.ts";

type Detector = (ctx: WinContext) => readonly YakuResult[];

const NUMBER_SUITS = ["m", "p", "s"] as const;

/** 順子の開始 rank(1..7) */
const SHUNTSU_START_RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** 刻子になり得る rank(1..9) */
const TRIPLET_RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 一気通貫を構成する順子の開始 rank */
const ITTSU_START_RANKS: readonly number[] = [1, 4, 7];

/** 三元牌の rank → 役名 */
const DRAGON_NAMES: Readonly<Record<number, string>> = {
  5: "haku",
  6: "hatsu",
  7: "chun",
};

const yaku = (name: string, han: number): YakuResult => ({ name, han });

/** 面前/鳴きの食い下がり翻 */
const kuisagari = (ctx: WinContext, menzen: number, open: number): number =>
  ctx.isMenzen ? menzen : open;

/** リーチが成立しているか(面前でないリーチ申告は意味的不整合として無視) */
const isRiichiEstablished = (ctx: WinContext): boolean =>
  ctx.isMenzen && ctx.riichi !== "none";

/** リーチ・ダブルリーチ(面前のみ。両立しない) */
const detectRiichi: Detector = (ctx) => {
  if (!isRiichiEstablished(ctx)) {
    return [];
  }
  return ctx.riichi === "double"
    ? [yaku("double_riichi", 2)]
    : [yaku("riichi", 1)];
};

/** 一発(リーチ成立時のみ) */
const detectIppatsu: Detector = (ctx) =>
  ctx.ippatsu && isRiichiEstablished(ctx) ? [yaku("ippatsu", 1)] : [];

/** 門前清自摸和 */
const detectMenzenTsumo: Detector = (ctx) =>
  ctx.isMenzen && ctx.isTsumo ? [yaku("menzen_tsumo", 1)] : [];

/** 三元牌または場風・自風の牌か(平和の雀頭判定) */
const isYakuhaiTile = (tile: Tile, ctx: WinContext): boolean =>
  Tile.isDragon(tile) ||
  Tile.equals(tile, ctx.seatWindTile) ||
  Tile.equals(tile, ctx.roundWindTile);

/** 順子の和了牌位置が嵌張(中央)または辺張(123の3/789の7)か */
const isClosedShuntsuWait = (group: Group, winTile: Tile): boolean => {
  const [low, middle, high] = group.tiles;
  if (winTile.rank === middle.rank) {
    return true;
  }
  if (winTile.rank === high.rank && low.rank === 1) {
    return true;
  }
  return winTile.rank === low.rank && high.rank === 9;
};

/** 和了が順子の両面待ちか */
const isRyanmenAgari = (form: StandardForm, ctx: WinContext): boolean => {
  if (ctx.agari.target !== "group") {
    return false;
  }
  const group = form.groups[ctx.agari.index];
  return isShuntsu(group) && !isClosedShuntsuWait(group, ctx.winTile);
};

/** 平和(面前・4順子・雀頭が役牌でない・両面待ち)。ツモでも成立 */
const detectPinfu: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null || !ctx.isMenzen) {
    return [];
  }
  if (!form.groups.every(isShuntsu)) {
    return [];
  }
  if (isYakuhaiTile(form.pair.tiles[0], ctx)) {
    return [];
  }
  return isRyanmenAgari(form, ctx) ? [yaku("pinfu", 1)] : [];
};

/** 断幺九(全牌が数牌2..8)。喰いタンあり */
const detectTanyao: Detector = (ctx) =>
  allTiles(ctx).every((tile) => Tile.isSimple(tile))
    ? [yaku("tanyao", 1)]
    : [];

/** 同一順子の組の数(一盃口=1、二盃口=2) */
const peikoPairCount = (form: StandardForm): number => {
  const counts = new Map<string, number>();
  for (const group of form.groups) {
    if (!isShuntsu(group)) {
      continue;
    }
    const key = Tile.key(group.tiles[0]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].reduce(
    (total, count) => total + Math.floor(count / 2),
    0,
  );
};

/** 一盃口/二盃口(面前のみ)。二盃口成立時は一盃口を併記しない */
const detectPeiko: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null || !ctx.isMenzen) {
    return [];
  }
  const pairCount = peikoPairCount(form);
  if (pairCount >= 2) {
    return [yaku("ryanpeiko", 3)];
  }
  return pairCount === 1 ? [yaku("iipeiko", 1)] : [];
};

/** 役牌(三元・場風・自風の刻子/槓子)。連風牌は round_wind と seat_wind の両方 */
const detectYakuhai: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const triplets = form.groups.filter(isTripletLike);
  const dragons = triplets
    .filter((group) => Tile.isDragon(group.tiles[0]))
    .map((group) => yaku(DRAGON_NAMES[group.tiles[0].rank], 1));
  const hasTripletOf = (target: Tile): boolean =>
    triplets.some((group) => Tile.equals(group.tiles[0], target));
  return [
    ...dragons,
    ...(hasTripletOf(ctx.roundWindTile) ? [yaku("round_wind", 1)] : []),
    ...(hasTripletOf(ctx.seatWindTile) ? [yaku("seat_wind", 1)] : []),
  ];
};

/** 三色同順(3色で同じ数の順子) */
const detectSanshoku: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const starts = shuntsuStartKeys(form);
  const found = SHUNTSU_START_RANKS.some((rank) =>
    NUMBER_SUITS.every((suit) => starts.has(`${suit}${rank}`)),
  );
  return found ? [yaku("sanshoku", kuisagari(ctx, 2, 1))] : [];
};

/** 一気通貫(同一色の123・456・789) */
const detectIttsu: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const starts = shuntsuStartKeys(form);
  const found = NUMBER_SUITS.some((suit) =>
    ITTSU_START_RANKS.every((rank) => starts.has(`${suit}${rank}`)),
  );
  return found ? [yaku("ittsu", kuisagari(ctx, 2, 1))] : [];
};

const groupHasYaochu = (group: Group): boolean =>
  group.tiles.some((tile) => Tile.isYaochu(tile));

const groupHasTerminal = (group: Group): boolean =>
  group.tiles.some((tile) => Tile.isTerminal(tile));

/**
 * 混全帯幺九/純全帯幺九(全面子・雀頭が幺九牌を含み、順子がある)。
 * 字牌が無ければ純全帯、あれば混全帯(排他)。順子が無い帯幺は混老頭側
 */
const detectChantaFamily: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null || !form.groups.some(isShuntsu)) {
    return [];
  }
  const blocks = blocksOf(form);
  if (!blocks.every(groupHasYaochu)) {
    return [];
  }
  return blocks.every(groupHasTerminal)
    ? [yaku("junchan", kuisagari(ctx, 3, 2))]
    : [yaku("chanta", kuisagari(ctx, 2, 1))];
};

/** 七対子(面前のみの形) */
const detectChiitoitsu: Detector = (ctx) =>
  ctx.form.kind === "chiitoitsu" ? [yaku("chiitoitsu", 2)] : [];

/** 対々和(4面子すべて刻子/槓子) */
const detectToitoi: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  return form !== null && form.groups.every(isTripletLike)
    ? [yaku("toitoi", 2)]
    : [];
};

/** 三暗刻(暗刻・暗槓がちょうど3つ。ロンで完成した刻子は明刻扱い) */
const detectSanankou: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  return form !== null && concealedTripletCount(form, ctx) === 3
    ? [yaku("sanankou", 2)]
    : [];
};

/** 三槓子(明カン・暗槓が3つ) */
const detectSankantsu: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const kanCount = form.groups.filter(
    (group) => group.type === "kantsu",
  ).length;
  return kanCount === 3 ? [yaku("sankantsu", 2)] : [];
};

/** 三色同刻(3色で同じ数の刻子/槓子) */
const detectSanshokuDoukou: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const kinds = new Set(
    form.groups
      .filter(isTripletLike)
      .filter((group) => !Tile.isHonor(group.tiles[0]))
      .map((group) => Tile.key(group.tiles[0])),
  );
  const found = TRIPLET_RANKS.some((rank) =>
    NUMBER_SUITS.every((suit) => kinds.has(`${suit}${rank}`)),
  );
  return found ? [yaku("sanshoku_doukou", 2)] : [];
};

/** 小三元(三元牌2種の刻子/槓子+残り1種の雀頭) */
const detectShousangen: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const dragonTriplets = form.groups.filter(
    (group) => isTripletLike(group) && Tile.isDragon(group.tiles[0]),
  ).length;
  return dragonTriplets === 2 && Tile.isDragon(form.pair.tiles[0])
    ? [yaku("shousangen", 2)]
    : [];
};

/** 混老頭(全牌が幺九牌かつ順子なし)。国士無双の形は対象外 */
const detectHonroutou: Detector = (ctx) => {
  if (ctx.form.kind === "kokushi") {
    return [];
  }
  if (ctx.form.kind === "standard" && ctx.form.groups.some(isShuntsu)) {
    return [];
  }
  return allTiles(ctx).every((tile) => Tile.isYaochu(tile))
    ? [yaku("honroutou", 2)]
    : [];
};

/** 混一色/清一色(数牌1種のみ。字牌があれば混一、なければ清一で排他) */
const detectFlush: Detector = (ctx) => {
  const tiles = allTiles(ctx);
  const numberSuits = new Set(
    tiles.filter((tile) => !Tile.isHonor(tile)).map((tile) => tile.suit),
  );
  if (numberSuits.size !== 1) {
    return [];
  }
  return tiles.some((tile) => Tile.isHonor(tile))
    ? [yaku("honitsu", kuisagari(ctx, 3, 2))]
    : [yaku("chinitsu", kuisagari(ctx, 6, 5))];
};

/** 状況役(海底ツモ・河底ロン・嶺上ツモ・槍槓ロン) */
const detectSituational: Detector = (ctx) => {
  const has = (name: WinContext["situational"][number]): boolean =>
    ctx.situational.includes(name);
  return [
    ...(has("haitei") && ctx.isTsumo ? [yaku("haitei", 1)] : []),
    ...(has("houtei") && !ctx.isTsumo ? [yaku("houtei", 1)] : []),
    ...(has("rinshan") && ctx.isTsumo ? [yaku("rinshan", 1)] : []),
    ...(has("chankan") && !ctx.isTsumo ? [yaku("chankan", 1)] : []),
  ];
};

const DETECTORS: readonly Detector[] = [
  detectRiichi,
  detectIppatsu,
  detectMenzenTsumo,
  detectPinfu,
  detectTanyao,
  detectPeiko,
  detectYakuhai,
  detectSanshoku,
  detectIttsu,
  detectChantaFamily,
  detectChiitoitsu,
  detectToitoi,
  detectSanankou,
  detectSankantsu,
  detectSanshokuDoukou,
  detectShousangen,
  detectHonroutou,
  detectFlush,
  detectSituational,
];

/** 通常役(ドラを除く)をすべて検出する。食い下がり適用済み */
export const detectNormalYaku = (ctx: WinContext): readonly YakuResult[] =>
  DETECTORS.flatMap((detector) => detector(ctx));
