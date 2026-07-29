import { WinContext } from "../../../../domains/win-context/index.ts";
import { WinningHand } from "../../../../domains/winning-hand/index.ts";
import { Yaku, type YakuName } from "../../../../domains/yaku/index.ts";

/**
 * 状況役の候補。和了種別と矛盾する状況フラグ(ロンでの海底など)は無視する。
 * 門前限定役は Yaku.of が null を返すため、副露時は自動的に除外される。
 */
const candidates = (
  context: WinContext,
): readonly (readonly [boolean, YakuName])[] => {
  const tsumo = WinContext.isTsumo(context);
  const dealer = WinContext.isDealer(context);
  return [
    [context.riichi === "riichi", "riichi"],
    [context.riichi === "double", "double_riichi"],
    [context.ippatsu && WinContext.isRiichi(context), "ippatsu"],
    [tsumo, "menzen_tsumo"],
    [WinContext.has(context, "rinshan") && tsumo, "rinshan_kaihou"],
    [WinContext.has(context, "chankan") && !tsumo, "chankan"],
    [WinContext.has(context, "haitei") && tsumo, "haitei_raoyue"],
    [WinContext.has(context, "houtei") && !tsumo, "houtei_raoyui"],
    // 天和は親の、地和は子の第一ツモでのみ成立する。
    [WinContext.has(context, "tenhou") && tsumo && dealer, "tenhou"],
    [WinContext.has(context, "chihou") && tsumo && !dealer, "chihou"],
  ];
};

export const SituationalYakuDetection = {
  /** 和了状況から成立する役(立直・一発・門前清自摸和・海底・河底・嶺上・搶槓・天和・地和)。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    const menzen = WinningHand.isMenzen(winningHand);
    return candidates(winningHand.context)
      .filter(([established]) => established)
      .map(([, name]) => Yaku.of(name, menzen))
      .filter((yaku): yaku is Yaku => yaku !== null);
  },
} as const;
