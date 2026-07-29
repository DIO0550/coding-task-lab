import { Block } from "../block/index.ts";

/** 和了形の種別。通常形・七対子・国士無双。 */
export type WinningFormKind = "standard" | "seven_pairs" | "thirteen_orphans";

/**
 * 和了形の1つの解釈。
 * 通常形は「面子4 + 雀頭1」、七対子は「対子7」、国士無双はブロックを持たない。
 */
export type WinningForm = Readonly<{
  kind: WinningFormKind;
  blocks: readonly Block[];
}>;

export const WinningForm = {
  /** 通常形。副露を含む面子4つと雀頭から構成する。 */
  standard(sets: readonly Block[], pair: Block): WinningForm {
    return { kind: "standard", blocks: [...sets, pair] };
  },

  /** 七対子。 */
  sevenPairs(pairs: readonly Block[]): WinningForm {
    return { kind: "seven_pairs", blocks: pairs };
  },

  /** 国士無双。 */
  thirteenOrphans(): WinningForm {
    return { kind: "thirteen_orphans", blocks: [] };
  },

  /** 面子(雀頭を除くブロック)。 */
  sets(form: WinningForm): readonly Block[] {
    return form.blocks.filter((block) => Block.isSet(block));
  },

  /** 雀頭。通常形以外では null。 */
  pair(form: WinningForm): Block | null {
    if (form.kind !== "standard") {
      return null;
    }
    return form.blocks.find((block) => block.kind === "pair") ?? null;
  },

  /** 刻子・槓子の一覧。 */
  tripletLikes(form: WinningForm): readonly Block[] {
    return form.blocks.filter((block) => Block.isTripletLike(block));
  },

  /** 順子の一覧。 */
  runs(form: WinningForm): readonly Block[] {
    return form.blocks.filter((block) => block.kind === "run");
  },

  /** 全ブロックが指定条件を満たすか。 */
  everyBlock(
    form: WinningForm,
    predicate: (block: Block) => boolean,
  ): boolean {
    return form.blocks.every(predicate);
  },
} as const;
