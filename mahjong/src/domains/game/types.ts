import type { Tile, WindTile } from "@/src/domains/tile";
import type { Meld } from "@/src/domains/meld";
import type { Wall } from "@/src/domains/wall";

/**
 * 対局状態のドメイン型定義。
 * 状態遷移ロジックは services/game、CPU の行動決定は services/cpu に置く。
 * (services 間の import は禁止のため、両者が共有する型をドメイン層に置く)
 */

export type PlayerKind = "human" | "cpu";

export type CpuLevel = "beginner" | "standard" | "advanced";

export type PlayerConfig = Readonly<{
  name: string;
  kind: PlayerKind;
  cpuLevel: CpuLevel;
}>;

export type GameType = "tonpuu" | "hanchan";

export type RuleConfig = Readonly<{
  gameType: GameType;
  startingPoints: 25000 | 30000;
  returnPoints: 30000 | null;
  kuitan: boolean;
  atozuke: boolean;
  akaDora: boolean;
  cpuAutoWin: boolean;
}>;

export type GameConfig = Readonly<{
  players: readonly [PlayerConfig, PlayerConfig, PlayerConfig, PlayerConfig];
  rules: RuleConfig;
}>;

/** 河の1枚。claimed は鳴かれた/ロンされた牌、tsumogiri はツモ切り */
export type DiscardEntry = Readonly<{
  tile: Tile;
  riichi: boolean;
  claimed: boolean;
  tsumogiri: boolean;
}>;

/**
 * 卓上の副露。from は鳴いた相手の席。
 * 暗槓は null、加槓は元のポンの from を保持する。
 */
export type GameMeld = Readonly<{
  meld: Meld;
  from: number | null;
}>;

export type RiichiDeclaration = "none" | "riichi" | "double";

export type PlayerState = Readonly<{
  /** 純手牌(ソート済み・ツモ牌を含まない) */
  hand: readonly Tile[];
  /** ツモ牌(鳴き直後の打牌待ち・他家の手番では null) */
  drawn: Tile | null;
  melds: readonly GameMeld[];
  discards: readonly DiscardEntry[];
  riichi: RiichiDeclaration;
  /** リーチ宣言牌の discards 内 index */
  riichiTileIndex: number | null;
  ippatsu: boolean;
  points: number;
  furiten: boolean;
  /**
   * 現在の待ち牌(手牌が 13-3n 枚形のときのみ有効。赤5は正規化)。
   * エンジンが手牌変化のたびに再計算する内部キャッシュ。
   */
  waits: readonly Tile[];
  /** 同巡内フリテン(見逃し)。次の自分のツモまたは打牌で解消 */
  temporaryFuriten: boolean;
  /** リーチ後の見逃しによる永続フリテン */
  riichiFuriten: boolean;
}>;

export type ClaimOption = Readonly<{
  player: number;
  canRon: boolean;
  canPon: boolean;
  /** 大明カン */
  canKan: boolean;
  /** 打牌とチーを構成できる自分の手牌2枚の組み合わせ */
  chiOptions: readonly (readonly [Tile, Tile])[];
}>;

export type GameAction =
  | Readonly<{ type: "discard"; player: number; tile: Tile; riichi: boolean }>
  | Readonly<{ type: "tsumo"; player: number }>
  | Readonly<{ type: "ankan"; player: number; tile: Tile }>
  | Readonly<{ type: "kakan"; player: number; tile: Tile }>
  | Readonly<{ type: "ron"; player: number }>
  | Readonly<{ type: "pon"; player: number }>
  | Readonly<{ type: "kan"; player: number }>
  | Readonly<{ type: "chi"; player: number; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "pass"; player: number }>
  | Readonly<{ type: "confirmRoundEnd" }>;

export type WinYakuEntry = Readonly<{ name: string; han: number }>;

export type WinResult = Readonly<{
  type: "win";
  winner: number;
  /** ロン時の放銃者(加槓へのロンは加槓者)。ツモは null */
  loser: number | null;
  winType: "tsumo" | "ron";
  yaku: readonly WinYakuEntry[];
  han: number;
  fu: number;
  scoreTotal: number;
  /** 席ごとの点数増減(本場・供託込み)。結果確定時に反映される */
  pointDeltas: readonly number[];
  /** 裏ドラ表示牌(リーチ和了時のみ非空) */
  uraDora: readonly Tile[];
  dealerKeeps: boolean;
}>;

export type DrawResult = Readonly<{
  type: "draw";
  tenpai: readonly boolean[];
  pointDeltas: readonly number[];
  dealerKeeps: boolean;
}>;

export type RoundResult = WinResult | DrawResult;

export type GameEndResult = Readonly<{
  /** rank 1..4 の順。同点は起家(席0)に近い方が上位 */
  ranking: readonly Readonly<{
    player: number;
    rank: number;
    points: number;
    /** 返し点ありのとき (points - returnPoints) / 1000。なしは null */
    settled: number | null;
  }>[];
}>;

export type ClaimsPhase = Readonly<{
  type: "claims";
  /** 打牌者(source が kakan のときは加槓者) */
  from: number;
  tile: Tile;
  source: "discard" | "kakan";
  options: readonly ClaimOption[];
  /** 席 index の応答。null は未回答。options に含まれる席の回答が揃うと解決する */
  responses: readonly (GameAction | null)[];
}>;

export type Phase =
  | Readonly<{ type: "turn"; actor: number }>
  | ClaimsPhase
  | Readonly<{ type: "roundEnd"; result: RoundResult }>
  | Readonly<{ type: "gameEnd"; result: GameEndResult }>;

export type RoundWind = "ton" | "nan";

export type Kyoku = 1 | 2 | 3 | 4;

export type RoundInfo = Readonly<{
  wind: RoundWind;
  kyoku: Kyoku;
  honba: number;
  /** 供託リーチ棒の本数 */
  kyotaku: number;
}>;

export type GameState = Readonly<{
  config: GameConfig;
  /** 席順。席0が起家(開始時の東家) */
  players: readonly PlayerState[];
  dealer: number;
  round: RoundInfo;
  /** 王牌を除いたツモ可能な残り枚数 */
  wallCount: number;
  doraIndicators: readonly Tile[];
  /** この局でツモが行われた回数 */
  turnCount: number;
  phase: Phase;
  /** 牌山(非公開情報。UI は playerView を使う) */
  wall: Wall;
  /** この局で鳴き(チー・ポン・カン)が発生したか。天和・地和・ダブルリーチの判定に使う */
  interrupted: boolean;
  /** 手番プレイヤーの現在のツモ牌が嶺上牌か */
  rinshan: boolean;
}>;

export type TurnActions = Readonly<{
  canTsumo: boolean;
  canRiichi: boolean;
  /** リーチ宣言打牌の候補(テンパイを維持する打牌) */
  riichiDiscards: readonly Tile[];
  /** 暗槓できる牌(赤5は正規化した代表牌) */
  ankanTiles: readonly Tile[];
  /** 加槓できる牌 */
  kakanTiles: readonly Tile[];
  /** 合法な打牌(リーチ後はツモ牌のみ) */
  discards: readonly Tile[];
}>;

/** 他家の公開情報 */
export type PublicPlayer = Readonly<{
  name: string;
  kind: PlayerKind;
  seatWind: WindTile;
  isDealer: boolean;
  handCount: number;
  hasDrawn: boolean;
  melds: readonly GameMeld[];
  discards: readonly DiscardEntry[];
  riichi: RiichiDeclaration;
  riichiTileIndex: number | null;
  points: number;
}>;

/**
 * 特定の席から見える情報のみを持つビュー。
 * 他家の手牌・ツモ牌は枚数のみ、牌山は残り枚数のみ。
 * claims フェーズの options / responses は自席の分だけ見える。
 */
export type PlayerView = Readonly<{
  seat: number;
  seatWind: WindTile;
  dealer: number;
  rules: RuleConfig;
  round: RoundInfo;
  wallCount: number;
  doraIndicators: readonly Tile[];
  turnCount: number;
  ownHand: readonly Tile[];
  ownDrawn: Tile | null;
  ownFuriten: boolean;
  players: readonly PublicPlayer[];
  phase: Phase;
}>;
