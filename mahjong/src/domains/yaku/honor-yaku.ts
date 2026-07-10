import type { Decomposition } from "../hand/index.ts";
import type { WinContext } from "../win-context/index.ts";
import { dragonTripletCount, isStandard, isTripletKind } from "./helpers.ts";
import type { YakuHit, YakuName } from "./types.ts";

const DRAGON_YAKU_BY_HONOR: Readonly<Record<string, YakuName>> = {
  haku: "yakuhai_haku",
  hatsu: "yakuhai_hatsu",
  chun: "yakuhai_chun",
};

/** 三元牌の刻子・槓子 → yakuhai_*、自風・場風の刻子・槓子 → seat_wind/round_wind(連風牌は両方成立)。 */
const detectHonorTriplets = (d: Decomposition, ctx: WinContext): readonly YakuHit[] => {
  if (!isStandard(d)) {
    return [];
  }
  const hits: YakuHit[] = [];
  for (const b of d.blocks) {
    if (!isTripletKind(b)) {
      continue;
    }
    const t = b.tiles[0];
    if (t === undefined || t.kind !== "honor") {
      continue;
    }
    const dragonYaku = DRAGON_YAKU_BY_HONOR[t.honor];
    if (dragonYaku !== undefined) {
      hits.push({ name: dragonYaku, han: 1 });
      continue;
    }
    if (t.honor === ctx.seatWind) {
      hits.push({ name: "seat_wind", han: 1 });
    }
    if (t.honor === ctx.roundWind) {
      hits.push({ name: "round_wind", han: 1 });
    }
  }
  return hits;
};

/** 三元牌の刻子2つ+三元牌の雀頭。 */
const detectShousangen = (d: Decomposition): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (dragonTripletCount(d) !== 2) {
    return null;
  }
  const pairTile = d.pair[0];
  if (pairTile.kind !== "honor" || DRAGON_YAKU_BY_HONOR[pairTile.honor] === undefined) {
    return null;
  }
  return { name: "shousangen", han: 2 };
};

export const detectHonorYaku = (d: Decomposition, ctx: WinContext): readonly YakuHit[] => {
  const shousangen = detectShousangen(d);
  return [...detectHonorTriplets(d, ctx), ...(shousangen !== null ? [shousangen] : [])];
};
