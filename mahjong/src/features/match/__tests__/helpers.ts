import { Tile } from "../../../domains/tile/index.ts";
import { Game } from "../../../domains/game/index.ts";
import type {
  GameState,
  PlayerConfig,
  RuleConfig,
  Seat,
} from "../../../domains/game/index.ts";
import { Random } from "../../../libs/random/index.ts";

/** 牌表記→Tile(テスト専用。表記不正は例外) */
export const t = (notation: string): Tile => {
  const tile = Tile.parse(notation);
  if (tile === null) {
    throw new Error(`invalid tile notation: ${notation}`);
  }
  return tile;
};

/** 決定的シナリオ用の固定ルール(赤ドラなしで牌指定を単純にする) */
export const FIXED_RULE: RuleConfig = {
  format: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: false,
  cpuAutoWin: true,
};

/** 席0=人間「あなた」、席1-3=CPU */
export const humanFirstPlayers = (): readonly PlayerConfig[] => [
  { kind: "human", name: "あなた", level: null },
  { kind: "cpu", name: "CPU1", level: "standard" },
  { kind: "cpu", name: "CPU2", level: "standard" },
  { kind: "cpu", name: "CPU3", level: "standard" },
];

/** 席1=人間「あなた」、他はCPU(子の和了シナリオ用) */
export const humanSecondPlayers = (): readonly PlayerConfig[] => [
  { kind: "cpu", name: "CPU1", level: "standard" },
  { kind: "human", name: "あなた", level: null },
  { kind: "cpu", name: "CPU2", level: "standard" },
  { kind: "cpu", name: "CPU3", level: "standard" },
];

/**
 * どの局面でもテンパイ・鳴き・ロンが発生しない捨て牌用の手
 * (同スート内の牌が常に3以上離れており、全種1枚ずつ)
 */
export const JUNK_A: readonly string[] = ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
export const JUNK_B: readonly string[] = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "4s", "7s", "haku", "hatsu", "chun", "ton"];
export const JUNK_C: readonly string[] = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "haku", "hatsu", "chun"];

/** 4p/7p 待ちの平和形テンパイ(234m 567m 234p + 56p + 99s) */
export const HUMAN_TENPAI: readonly string[] = ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5p", "6p", "9s", "9s"];

type OrderSpec = Readonly<{
  /** 各席の配牌(13枚×4) */
  hands: readonly (readonly string[])[];
  /** ツモ順(先頭=親の第1ツモ)。残りは未使用牌で自動補充 */
  draws?: readonly string[];
  /** 表ドラ表示牌(先頭が開局時公開)。未指定は残り牌 */
  doraIndicators?: readonly string[];
}>;

const DRAW_PILE_SIZE = 70;
const RINSHAN_SIZE = 4;
const INDICATOR_SIZE = 5;

/**
 * 部分指定から136枚の固定牌山(Game.start の wallOrder 用の並び)を作る。
 * 指定牌をプールから取り出し、未指定のスロットは残り牌で順に埋める
 */
export const buildOrder = (spec: OrderSpec): readonly Tile[] => {
  const pool: Tile[] = [];
  for (const kind of Tile.all()) {
    for (let copy = 0; copy < 4; copy += 1) {
      pool.push(kind);
    }
  }
  const takeExact = (notation: string): Tile => {
    const index = pool.findIndex((tile) => Tile.toNotation(tile) === notation);
    if (index < 0) {
      throw new Error(`tile not available in pool: ${notation}`);
    }
    return pool.splice(index, 1)[0];
  };
  if (spec.hands.length !== 4 || spec.hands.some((hand) => hand.length !== 13)) {
    throw new Error("hands must be 4 x 13 tiles");
  }
  const hands = spec.hands.map((hand) => hand.map(takeExact));
  const draws = (spec.draws ?? []).map(takeExact);
  const dora = (spec.doraIndicators ?? []).map(takeExact);
  const fill = (taken: readonly Tile[], size: number): readonly Tile[] => {
    if (taken.length > size) {
      throw new Error("too many tiles specified");
    }
    return [...taken, ...pool.splice(0, size - taken.length)];
  };
  return [
    ...hands.flat(),
    ...fill(draws, DRAW_PILE_SIZE),
    ...fill([], RINSHAN_SIZE),
    ...fill(dora, INDICATOR_SIZE),
    ...fill([], INDICATOR_SIZE),
  ];
};

/** 固定牌山で対局を開始する */
export const startFixed = (
  spec: OrderSpec,
  players: readonly PlayerConfig[],
  rule?: Partial<RuleConfig>,
): GameState =>
  Game.start({ ...FIXED_RULE, ...rule }, players, Random.seeded(1), {
    wallOrder: buildOrder(spec),
  });

/** シナリオ構築用の打牌。不正(状態が変わらない)なら例外にして誤設定を検知する */
const setupDiscard = (
  state: GameState,
  seat: Seat,
  notation: string,
): GameState => {
  const next = Game.apply(state, seat, { type: "discard", tile: t(notation) });
  if (next === state) {
    throw new Error(`setup discard was illegal: seat=${seat} tile=${notation}`);
  }
  return next;
};

/**
 * 人間(席0=親)がツモ和了できる直前の状態。
 * 1巡ジャンク牌を切り合ったあと、席0が 7p をツモって
 * 門前清自摸和+平和(2翻20符・親ツモ700オール=2100点)で和了できる
 */
export const dealerTsumoState = (rule?: Partial<RuleConfig>): GameState => {
  const started = startFixed(
    {
      hands: [HUMAN_TENPAI, JUNK_A, JUNK_B, JUNK_C],
      draws: ["1s", "pei", "hatsu", "sha", "7p"],
      doraIndicators: ["haku"],
    },
    humanFirstPlayers(),
    rule,
  );
  const afterSeat0 = setupDiscard(started, 0, "1s");
  const afterSeat1 = setupDiscard(afterSeat0, 1, "pei");
  const afterSeat2 = setupDiscard(afterSeat1, 2, "hatsu");
  return setupDiscard(afterSeat2, 3, "sha");
};

/**
 * 人間(席1=子)が席0(CPU)の捨てた 7p にロンできる応答フェーズの状態。
 * 平和のみ(1翻30符=1000点)。確定すると親が席1へ移り東二局になる
 */
export const ronState = (rule?: Partial<RuleConfig>): GameState => {
  const started = startFixed(
    {
      hands: [JUNK_A, HUMAN_TENPAI, JUNK_B, JUNK_C],
      draws: ["1s", "pei", "hatsu", "nan", "7p"],
      doraIndicators: ["haku"],
    },
    humanSecondPlayers(),
    rule,
  );
  const afterSeat0 = setupDiscard(started, 0, "1s");
  const afterSeat1 = setupDiscard(afterSeat0, 1, "pei");
  const afterSeat2 = setupDiscard(afterSeat1, 2, "hatsu");
  const afterSeat3 = setupDiscard(afterSeat2, 3, "nan");
  return setupDiscard(afterSeat3, 0, "7p");
};

/** 持ち点500で開始し、ロン確定でトビ終局(最終順位表示)になる状態 */
export const tobiRonState = (): GameState => ronState({ startingPoints: 500 });

/**
 * 人間(席0)の手番の状態(全席ジャンク手・ツモ牌 ton)。
 * どの牌を切っても鳴き・ロンは発生しない
 */
export const humanTurnState = (): GameState =>
  startFixed(
    { hands: [JUNK_A, JUNK_B, JUNK_C, JUNK_A], draws: ["ton", "2s", "5p"] },
    humanFirstPlayers(),
  );

/** 人間が打牌済みで、席1(CPU)の手番になっている状態(CPU自動進行の検証用) */
export const cpuTurnState = (): GameState => {
  const started = humanTurnState();
  return setupDiscard(started, 0, "ton");
};

/** 9s 単騎(234m 567m 234p 567p + 9s)。残りの 9s は全て他家の手にあり和了は発生しない */
const H_TANKI: readonly string[] = ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5p", "6p", "7p", "9s"];
/** JUNK_B の 7s を 9s に置き換えたジャンク手(9s を抱えて流局まで保持する) */
const JUNK_B9: readonly string[] = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "4s", "9s", "haku", "hatsu", "chun", "ton"];
/** JUNK_C の 8s を 9s に置き換えたジャンク手 */
const JUNK_C9: readonly string[] = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "9s", "nan", "haku", "hatsu", "chun"];

/**
 * 荒牌流局した状態(席0=人間・親のみテンパイ)。
 * 全員ツモ切りで山を出し尽くす(鳴き機会はすべてパス)。
 * ノーテン罰符: 席0が+3000、他が-1000ずつ。親テンパイのため連荘
 */
export const drawState = (): GameState => {
  const started = startFixed(
    { hands: [H_TANKI, JUNK_A, JUNK_B9, JUNK_C9] },
    humanFirstPlayers(),
  );
  let state = started;
  for (let guard = 0; guard < 400; guard += 1) {
    if (state.phase === "result_draw") {
      return state;
    }
    if (state.phase === "response") {
      const responder = Game.currentActor(state);
      if (responder === null) {
        throw new Error("response phase without responder");
      }
      state = Game.apply(state, responder, { type: "pass" });
      continue;
    }
    if (state.phase !== "action") {
      throw new Error(`unexpected phase during exhaustion: ${state.phase}`);
    }
    const seat = state.turn;
    const drawn = state.players[seat].drawn;
    if (drawn === null) {
      throw new Error("active player has no drawn tile");
    }
    state = Game.apply(state, seat, { type: "discard", tile: drawn });
  }
  throw new Error("round did not reach exhaustive draw within guard limit");
};
