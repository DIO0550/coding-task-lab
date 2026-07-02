# docs/spec-phase1.md — 麻雀点数計算エンジン仕様(Phase 1)

4人麻雀(リーチ麻雀・標準ルール)の点数計算エンジンを実装する。

## 関連仕様

- 対戦画面の画面仕様は [docs/spec-match-screen.md](./spec-match-screen.md) を参照。なお、Phase 1 の点数計算エンジン実装スコープには UI 実装を含めない。

## スコープ

| 含む | 含まない(将来フェーズ) |
|---|---|
| 和了判定(通常形・七対子・国士無双) | 三人麻雀 |
| 役判定(1〜13翻、役満) | ローカル役 |
| 符計算 | 流局処理・ゲーム進行 |
| 点数計算(子/親、ツモ/ロン、本場・供託) | UI |

## 採用ルール(曖昧さ排除のための確定事項)

- 喰いタン: あり
- 後付け: あり
- 平和ツモ: 20符
- 七対子: 25符固定
- 切り上げ満貫: なし
- 役満の複合: あり(ダブル役満まで)
- 数え役満: 13翻以上
- 人和: 採用しない
- 緑一色に發: 不要(發なし緑一色も役満)

※ 上記以外で解釈が分かれる事項を発見した場合は、実装内の `docs/assumptions.md` に判断を記録すること。

## 入出力JSON契約

### 入力

```jsonc
{
  "hand": ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"], // 純手牌(和了牌含む)
  "melds": [ // 副露(なければ空配列)
    { "type": "chi" | "pon" | "kan" | "ankan", "tiles": ["1m", "2m", "3m"] }
  ],
  "winTile": "5m",
  "winType": "tsumo" | "ron",
  "seatWind": "ton" | "nan" | "sha" | "pei",
  "roundWind": "ton" | "nan",
  "dora": ["3m"],          // ドラ表示牌ではなくドラそのもの
  "uraDora": [],           // リーチ時のみ有効
  "riichi": "none" | "riichi" | "double",
  "ippatsu": false,
  "situational": []        // "haitei" | "houtei" | "rinshan" | "chankan" | "tenhou" | "chihou"
}
```

牌表記: `1m`〜`9m`(萬子), `1p`〜`9p`(筒子), `1s`〜`9s`(索子), `ton/nan/sha/pei/haku/hatsu/chun`(字牌), 赤5は `0m/0p/0s`

### 出力(和了時)

```jsonc
{
  "valid": true,
  "yaku": [ { "name": "pinfu", "han": 1 } ],   // 役名は英語スネークケース(別表参照)
  "han": 3,
  "fu": 30,
  "score": {
    "total": 5800,
    "payments": [ ... ] // ツモ時は支払い内訳
  }
}
```

### 出力(和了不成立 / 役なし)

```jsonc
{ "valid": false, "reason": "no_yaku" | "not_winning_hand" | "invalid_input" }
```

※ 役名一覧・点数早見表・符計算の詳細手順は本仕様の付録として完全記述する(TODO: 付録A〜C作成)

## 高点法

複数の解釈が可能な手(待ちの取り方、面子の分解)は、**最も点数が高くなる解釈**を採用すること。

## 受け入れ基準

- `echo '<入力JSON>' | pnpm --silent calc` で出力JSONが返ること
- `AGENTS.md` および `rules/` 配下の規約に準拠していること
- 本仕様の全項目に対するテストを自作し、すべて通ること
