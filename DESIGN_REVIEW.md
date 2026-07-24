# DESIGN_REVIEW.md

## Purpose

KeepOn の UI 変更をレビューし、ルールの置き場所を決めるための運用ガイド。視覚の正本は `DESIGN.md`。このファイルは振り分け・昇格・例外・エスカレーションだけを扱う。

## Scope

対象:

- 画面・コンポーネントの見た目変更
- 共有トークン / 共有コンポーネントへの昇格判断
- `DESIGN.md` との整合確認
- feature-local 例外の明示

対象外:

- プロダクト要件の優先度付け
- バックログ管理
- `DESIGN.md` に書くべき視覚ルールの代替保管

## Routing Rules

次の順で置く場所を決める。

1. 複数画面で再利用する視覚ルール → `DESIGN.md`
2. セマンティクス・状態モデル・a11y が揃った実装 → shared（`src/components/` のラッパー、または既存 primitives の利用）
3. 単画面・実験・一時対応 → feature-local（その機能配下に閉じる）

### `DESIGN.md` に入れる

- 色ロール、タイポ階層、角丸・余白の意味
- カード / ボタン / チェックイン円など、画面を横断する見た目
- ストリーク没入と Utility 面のトーン切り替え
- 再利用可能な motion の原則（頻度・目的・reduced-motion）

### shared に入れる

- すでに複数画面で同じ状態（loading / empty / error / disabled）を持つもの
- a11y（フォーカス、ラベル、キーボード）が共通化できるもの
- `src/components/ui/` は直接編集しない。見た目のカスタムは `src/components/` 配下のラッパーで行う
- フォーム入力の共有は `@/components/Input`（または basics ラッパー）を優先する

### feature-local に残す

- 一画面だけのレイアウト実験
- debug / health / 一時的な警告色
- まだ状態モデルが揃っていないパネル
- 習慣プリセット選択など、専用フローの全面テーマ

### 昇格条件

見た目が似ているだけでは shared に上げない。次が揃ってから昇格する。

- 同じ意味の props / 状態
- 同じ empty / loading / error の扱い
- 同じフォーカスとラベル方針
- `DESIGN.md` のロールにマッピングできること

## Review Flow

1. `DESIGN.md` に照らして、トーン・色・型・余白・コンポーネント言語が崩れていないか確認する。
2. 既存 shared / ラッパーで足りるか確認する。新規 primitive が必要なら理由を書く。
3. feature-local に閉じるなら、例外として明示し、横展開しない条件を残す。
4. ルール自体が複数画面に広がるなら、実装の前または直後に `DESIGN.md` を更新する。
5. `DESIGN.md` を変更したら `npx @google/design.md lint DESIGN.md` を通し、errors / warnings を残さない。

## Review Format

```md
総合判定: OK | 調整推奨 | 大幅修正推奨

- 構造: OK | 要修正 | 不足
  理由: ...
- 雰囲気記述: OK | 要修正 | 不足
  理由: ...
- 色: OK | 要修正 | 不足
  理由: ...
- タイポグラフィ: OK | 要修正 | 不足
  理由: ...
- コンポーネント: OK | 要修正 | 不足
  理由: ...
- レイアウト: OK | 要修正 | 不足
  理由: ...
- Stitch再利用性: OK | 要修正 | 不足
  理由: ...

優先修正:

1. ...
2. ...
3. ...
```

追加で KeepOn 固有の観点:

- Utility surfaces をダッシュボード branded canvas へ不用意に広げていないか
- 高頻度チェックイン操作に重い motion を載せていないか
- safe-area を固定 UI が無視していないか
- `ui/` 直編集や、ラッパーを経由しない入力コンポーネント追加がないか

## Escalation

次のときは止めて確認する。

- 同じ例外が 2 画面以上にコピーされ始めた
- `DESIGN.md` と実装トークン（`globals.css`）が食い違う
- shared に上げたいが状態モデルまたは a11y が未統一
- primary（テーマ）と習慣色の役割が混線している
- 新しい角丸・影・フォント階層を増やさないと成立しない提案
- デザイン言語が矛盾している、または再利用ルールが未定義のまま実装が進もうとしている

エスカレーション時は、未決事項・足りない証拠・仮置き先（local / shared / DESIGN.md）を明示する。

## Notes

- 最小修正で所有権を戻す。ドキュメントとコードの両方に同じルールを二重定義し続けない。
- 意図的な local 例外は、PR またはこのファイルの Notes 追記で残す。黙って広げない。
- 現行の既知例外（横展開禁止）:
  - オフライン帯の yellow 警告色
  - 認証まわりの独自グラデーション
  - HabitPresetSelector の専用全面テーマ
  - Help の強い uppercase tracking
  - PWA manifest のブラウザクローム色（`#000000`）
  - TaskCircle の旧サイズ系統（80/128/160）— 現行 streak circle（140/120）と統合しない
- ダッシュボードのリスト／シンプル両方が `primary` 外枠なのは intentional な branded canvas。Utility surfaces の禁止対象は設定・ヘルプ・アナリティクス側。
- コントラスト負債: 実装の一部（`primary` step-10 + 明るい on-color、習慣色 step-9 + 明るいアイコン色）は AA 4.5:1 を下回る。`DESIGN.md` の component トークンは `*-emphasis` を正とする。既存 UI の追従は別タスクとし、新規 UI は emphasis 側に合わせる。
- 未配線トークン: `*-emphasis` / `habit-*` / `streak-*` / `overlay` は `DESIGN.md` 正本だが、現行 `globals.css` にはまだ CSS 変数化されていない。配線または実装追従は別タスク。
