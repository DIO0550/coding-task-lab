# 点数計算エンジンのCLI入出力契約

`echo '<入力JSON>' | pnpm --silent calc` で標準入力のJSONを計算し、標準出力へ結果JSONを1行で返す。

## 入力

```jsonc
{
  "hand": ["1m", "2m", "3m", "..."],  // 純手牌(和了牌含む)。13-3×副露数 枚(和了牌なし形式)も受け付ける
  "melds": [ { "type": "chi" | "pon" | "kan" | "ankan", "tiles": ["1m", "2m", "3m"] } ],
  "winTile": "5m",
  "winType": "tsumo" | "ron",
  "seatWind": "ton" | "nan" | "sha" | "pei",
  "roundWind": "ton" | "nan",
  "dora": ["3m"],          // ドラ表示牌ではなくドラそのもの
  "uraDora": [],           // リーチ時のみ有効
  "riichi": "none" | "riichi" | "double",
  "ippatsu": false,
  "situational": [],       // "haitei" | "houtei" | "rinshan" | "chankan" | "tenhou" | "chihou"
  "honba": 0,              // 省略可(既定0)
  "kyotaku": 0             // 省略可(既定0、供託本数)
}
```

牌表記: `1m`〜`9m`, `1p`〜`9p`, `1s`〜`9s`, `ton/nan/sha/pei/haku/hatsu/chun`。赤5は `0m/0p/0s`。

## 出力(和了時)

```jsonc
{
  "valid": true,
  "yaku": [ { "name": "pinfu", "han": 1 } ],  // 役名は docs/assumptions.md の一覧参照
  "han": 3,
  "fu": 30,
  "score": {
    "total": 5800,                            // 和了者の受取合計(本場・供託込み)= payments の合計
    "payments": [ { "from": "discarder" | "dealer" | "non_dealer" | "pot", "amount": 5800 } ]
  }
}
```

## 出力(和了不成立 / 役なし / 入力不正)

```jsonc
{ "valid": false, "reason": "no_yaku" | "not_winning_hand" | "invalid_input" }
```

採用ルール・曖昧箇所の解釈は docs/spec-phase1.md と docs/assumptions.md に従う。
