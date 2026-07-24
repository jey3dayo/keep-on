---
version: alpha
name: KeepOn
description: Crisp habit-streak PWA. Quiet Slate neutrals, one accent primary, immersive streak surfaces for check-in delight.
colors:
  background: "#fcfcfd"
  foreground: "#1c2024"
  card: "#f9f9fb"
  card-foreground: "#1c2024"
  popover: "#fcfcfd"
  popover-foreground: "#1c2024"
  primary: "#0d9b8a"
  primary-emphasis: "#008573"
  primary-foreground: "#ffffff"
  secondary: "#f0f0f3"
  secondary-foreground: "#60646c"
  muted: "#f0f0f3"
  muted-foreground: "#8b8d98"
  accent: "#e8e8ec"
  accent-foreground: "#60646c"
  destructive: "#e5484d"
  destructive-emphasis: "#ce2c31"
  destructive-foreground: "#ffffff"
  success: "#12a594"
  success-emphasis: "#008573"
  success-foreground: "#ffffff"
  border: "#d9d9e0"
  ring: "#12a594"
  overlay: "#000000cc"
  habit-default: "#f76b15"
  habit-emphasis: "#cc4e00"
  habit-on-default: "#ffffff"
  streak-progress: "#fffffff2"
  streak-glow: "#ffffff59"
typography:
  display:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  title:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  heading:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  2xl: 16px
  3xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  page: 24px
  section: 24px
  card: 16px
  control: 36px
  content: 448px
components:
  button-primary:
    backgroundColor: "{colors.primary-emphasis}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: 16px
  button-destructive:
    backgroundColor: "{colors.destructive-emphasis}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: 16px
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
  button-ghost-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: 12px
  input-border:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  focus-ring:
    backgroundColor: "{colors.ring}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  drawer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  overlay-scrim:
    backgroundColor: "{colors.overlay}"
  habit-checkin:
    backgroundColor: "{colors.habit-emphasis}"
    textColor: "{colors.habit-on-default}"
    rounded: "{rounded.full}"
    size: 56px
  habit-progress-track:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.full}"
    height: 8px
  habit-progress-fill:
    backgroundColor: "{colors.habit-default}"
    rounded: "{rounded.full}"
    height: 8px
  habit-circle:
    backgroundColor: "{colors.primary-emphasis}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    size: 120px
  habit-circle-ring:
    backgroundColor: "{colors.streak-progress}"
    rounded: "{rounded.full}"
    size: 140px
  habit-circle-glow:
    backgroundColor: "{colors.streak-glow}"
    rounded: "{rounded.full}"
  destructive-border:
    backgroundColor: "{colors.background}"
    textColor: "{colors.destructive-emphasis}"
    rounded: "{rounded.md}"
  destructive-fill:
    backgroundColor: "{colors.destructive}"
    rounded: "{rounded.full}"
  success-fill:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.full}"
  meta-on-dark:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
  add-habit:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 24px
  empty-icon:
    backgroundColor: "{colors.card}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.full}"
    size: 64px
  toast:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  toast-success:
    backgroundColor: "{colors.success-emphasis}"
    textColor: "{colors.success-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  meta:
    backgroundColor: "{colors.background}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
---

## Visual Theme & Atmosphere

KeepOn は習慣のチェックインに集中する、落ち着いた PWA である。基調は Radix Slate のニュートラルと、ユーザーが選ぶ単一のアクセント（既定は Teal）。情報画面は border 中心で静かに整理し、装飾や過剰な影は使わない。

感情の芯は「すぐ分かる・すぐ触れる・続けたくなる」。達成感はストリークの没入ビューとチェックインの短いフィードバックに寄せ、日常の操作 UI を派手にしない。

三つのトーンを使い分ける:

- **Dashboard branded canvas**: ダッシュボード（リスト／シンプル）の外枠は `primary` で塗る。カードや円が手前に乗る。
- **Streak immersion**: シンプルビューの円チェックイン。白の進捗リング（`habit-circle-ring`）と完了グローで達成を示す。内側の色面はページのブランド色を共有する。
- **Utility surfaces**: 設定、ヘルプ、アナリティクスなどダッシュボード外。明るい card、細い border、短いコピー。全面アクセント塗りにしない。

YAML の `*-emphasis` / `habit-*` / `streak-*` / `overlay` は新規 UI の正本である。既存 CSS 変数へ未配線のものはデザイン目標として扱い、実装追従はレビュー側の負債メモに従う。

モーションは目的があるときだけ。press の小さな scale、進捗の width/stroke、occasional な sheet/drawer、稀なサーフェス入退場。高頻度操作に長い演出を載せない。`prefers-reduced-motion` では transform を抑え、必要な変化は短い opacity に落とす。

## Colors

色はセマンティックロールで扱う。トークン値はライト既定（Teal アクセント、sRGB）。ダークは同じロールを Radix dark パレットへ写す。アクセントテーマは `primary` / `ring` / `accent` を差し替えるだけで、他ロールは維持する。

- **background / foreground**: アプリの土台と本文。前景は常に高いコントラスト。
- **card / popover**: コンテンツ面と浮遊面。card は background より一段だけ手前。
- **primary / primary-emphasis / primary-foreground**: ブランドと主要アクション。ダッシュボード外枠や大きな色面は `primary`。文字を載せる小さなコントロールは WCAG AA を満たす `primary-emphasis` と明るい on-color を使う。
- **secondary / muted / accent**: 低強調の面とホバー。`muted-foreground` は装飾的な補助や無効表現向けで、本文・操作ラベル・アイコンの主色には `secondary-foreground` 以上を使う。
- **destructive / destructive-emphasis**: 削除・危険確認。塗りつぶしボタンは `destructive-emphasis`。アウトラインや文言の危険色は `destructive`。
- **success / success-emphasis / ring**: 成功とフォーカスリング。文字を載せる成功面は `success-emphasis`。
- **border**: 区切りの主手段。影より先に border で階層を作る。
- **habit-default / habit-emphasis**: リスト側の習慣固有色。バーや大きな色面は `habit-default`、アイコン文字を載せる円は `habit-emphasis`。同一習慣内で色を一貫させる。
- **overlay / streak-progress / streak-glow**: モーダル背後とストリーク進捗・完了グロー。

ストリーク没入では、primary の上に薄い白の radial と暗い縦グラデーションを重ねて奥行きを出す。進捗線はほぼ不透明な白、完了時のみ白い soft glow。

## Typography

カスタム表示フォントは持たない。システム UI サンセリフを使い、階層はサイズとウェイトで作る。

- **display**: ページタイトル。太く、短い見出し向け。
- **title**: セクションや大きな数値。
- **heading**: カード・コンポーネント見出し。tracking をわずかに締める。
- **body**: 習慣名や主文。medium を基本にし、読みやすさを保つ。
- **body-sm**: 操作ラベル、補助説明、ボタン（medium）。
- **label**: バッジ、メタ、キャプション。主に `secondary-foreground` と組み合わせる。

長文の説明は行間をやや広めにする。見出しはバランスよく折り返す。連続日数や進捗の数字は必ず tabular numerals。

## Layout & Spacing

余白の基本単位は 4/8/12/16/24。ページ外周とセクション間隔は `spacing.page` / `spacing.section`（24px）。カード内の標準は 24px、密度の高いリストカードは `spacing.card`（16px）。コントロール高さは `spacing.control`（36px）。共有ラッパーの入力は 40px まで許容する。

シェル:

- ダッシュボードのサイドバー幅 18rem、ヘッダー高さ 3rem。
- デスクトップのコンテンツ inset は外側マージンと xl 角丸で「アプリ内パネル」にする。
- フォームや詳細は `spacing.content`（448px）幅に収め、モバイル幅でも同じリズムを保つ。

リスト:

- カード間 12px、セクション間 24px。
- シンプルビューは 2 列グリッド、最大幅 `spacing.content`、下余白で fixed nav を避ける。

PWA:

- `safe-area-inset-top` / `bottom` をヘッダー、オフライン帯、ボトムナビ、フローティング操作に必ず足す。
- ボトムナビと衝突する操作は、ナビ高さ分だけ上に退避する。

## Elevation & Depth

階層はまず border、次にごく弱い shadow。カードは薄い border + 控えめな shadow。一覧カードは半透明 card と soft shadow。ホバーで shadow を一段だけ上げてよい。

ガラス面（ヘッダー、sticky サマリー、ボトムナビ）は半透明背景 + backdrop blur。モーダル/ドロワーは強い overlay と強い shadow。確認ダイアログだけさらに強い shadow を許可する。

ストリーク没入の奥行きは、影ではなく色面とグラデーションとグローで作る。

## Shapes

角丸は用途で固定する。

- **sm (6px)**: 小さなチップや補助コントロール。
- **md (8px)**: 標準ボタン、入力、ダイアログ、トースト。
- **xl (14px)**: 標準カード、デスクトップ inset。
- **2xl (16px)**: リスト習慣カード、ボトムシート上端、カスタム確認面。
- **3xl (24px)**: sticky な大きなサマリー面。
- **full**: チェックイン円、フィルター pill、色スウォッチ、FAB 的な追加ボタン。

同じ役割のコントロールで角丸を混ぜない。円は Habit / Check-in のアイデンティティなので、リストでもシンプルビューでも維持する。

## Components

### Buttons

Primary は塗りと短い影。Destructive は危険操作のみ。Ghost は低強調。押下フィードバックは小さな scale-down（おおよそ 0.95）。ホバーの拡大はインタラクティブな強調面に限り、常用ナビや高頻度チェックインには載せない。

主要 CTA の「習慣を追加」は foreground 塗り・full pill・強めの影で、一覧の末尾や空状態から見つけやすくする。

### Cards & lists

標準カードは xl 角丸、border、card 背景。習慣リストカードは 2xl、左に色付きチェックイン円、右にストリーク数値、中央に名前と進捗バー。完了行は opacity を下げて「済」を示す。ダッシュボードのリストは branded canvas 上にカードを置く。

### Check-in & streak

- リスト: `habit-checkin`（56px）の習慣色円。完了でチェックアイコン。
- シンプル: `habit-circle-ring`（140px）の進捗リング、`habit-circle`（120px）の色面、アイコン 56px。完了でわずかに拡大し glow。
- リストの進捗バーは習慣色。シンプルのリングは白。変化は 300–500ms の ease-out。

長押しで操作メニューを開く円は、短タップと区別できる進行表示を持つ。進行は hold-to-confirm の線形 fill。短タップのチェックインでは進行がちらつかないこと。

### Overlays

Drawer は下から。Sheet/Dialog は中央または下端。背後は overlay。フォーム系のルートモーダルも同じ言語に合わせる。

### Empty states

中央寄せ、`empty-icon`（64px）の丸いアイコン面、短い説明、Add Habit CTA。装飾イラストや長いコピーは置かない。

### Inputs & feedback

入力は透明〜background、border、36–40px 高、focus は ring。エラーは destructive border。Toast は popover 面、右下、短文。

## Do's and Don'ts

### Do

- セマンティック色ロールを使い、画面ごとに新しい hex を増やさない。
- border で区切り、影は補助にする。
- チェックイン結果をすぐ見せる（色・リング・短い motion）。
- 数字に tabular numerals を使う。
- safe-area を固定 UI に必ず足す。
- reduced-motion で transform を抑え、必要な状態変化だけ残す。

### Don't

- 日常のリスト操作やキーボード操作に長い演出を付けない。
- muted-foreground を本文に使わない。
- Utility surfaces（設定・ヘルプ・アナリティクス）をダッシュボード branded canvas と同じ全面アクセント塗りにしない。
- 習慣色とテーマアクセントを混同しない。習慣色はリスト上のアイテム識別、primary はブランドとダッシュボード外枠。
- カードの中にさらにカードを多重ネストして密度を上げない。
- 画面固有の例外パターンを全体の見出し・色規則へ広げない。
