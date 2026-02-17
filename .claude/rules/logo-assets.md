# ロゴアセット管理ガイドライン

## ロゴファイルの配置

すべてのロゴファイルは `assets/logos/` ディレクトリで管理します。

```text
assets/
└── logos/
    ├── original.png    # オリジナルロゴ（1024x1024推奨）
    └── logo.svg        # ベクター版ロゴ
```

## ファイル仕様

### original.png

**用途**: PWAアイコン生成の元画像

**要件**:

- 形式: PNG (RGBA または RGB)
- サイズ: 1024x1024 以上（正方形）
- 推奨解像度: 72-300 DPI
- 背景: 透明または単色

**注意事項**:

- このファイルから全てのPWAアイコンが自動生成されます
- 高解像度を維持することで、各サイズのアイコンの品質が向上します

### logo.svg

**用途**: ベクター版ロゴ（Webサイト表示、印刷物など）

**要件**:

- 形式: SVG (Scalable Vector Graphics)
- 最適化: 不要な属性やメタデータを削除済み
- アクセシビリティ: `<title>` タグを含めること推奨

**利点**:

- 解像度非依存（拡大縮小しても品質劣化なし）
- ファイルサイズが小さい
- CSS/JavaScriptで色やスタイルを動的に変更可能

## PWAアイコン生成

### 生成スクリプト

`scripts/generate-pwa-icons.mjs` を使用してPWAアイコンを生成します。

**実行方法**:

```bash
node scripts/generate-pwa-icons.mjs
```

**生成されるアイコン**:

| ファイル名                     | サイズ  | 用途                      |
| ------------------------------ | ------- | ------------------------- |
| `public/icon-192.png`          | 192x192 | PWA標準アイコン           |
| `public/icon-512.png`          | 512x512 | PWA標準アイコン           |
| `public/icon-maskable-192.png` | 192x192 | Androidマスカブルアイコン |
| `public/icon-maskable-512.png` | 512x512 | Androidマスカブルアイコン |
| `public/apple-touch-icon.png`  | 180x180 | iOSホーム画面アイコン     |

### Maskable Icons

Android 8.0以降では「マスカブルアイコン」がサポートされています。

**特徴**:

- 80%のサイズで中央配置
- 周囲に20%のセーフゾーン（padding）を確保
- 背景色: 黒 (`{ r: 0, g: 0, b: 0, alpha: 1 }`)

**デザイン推奨事項**:

- 重要な要素は中央の80%領域に配置
- 周囲20%は切り取られる可能性があることを考慮

## ロゴ更新手順

### 1. 新しいロゴファイルの準備

```bash
# オリジナルロゴを配置
cp /path/to/new-logo.png assets/logos/original.png

# ベクター版がある場合
cp /path/to/new-logo.svg assets/logos/logo.svg
```

### 2. PWAアイコンの再生成

```bash
# アイコン生成スクリプトを実行
node scripts/generate-pwa-icons.mjs
```

### 3. 生成結果の確認

```bash
# ファイルサイズを確認
ls -lh public/{icon-*,apple-touch-icon.png}

# 開発サーバーで表示確認
pnpm env:run -- pnpm dev
```

### 4. 変更のコミット

```bash
# ロゴファイルをコミット
git add assets/logos/original.png assets/logos/logo.svg

# PWAアイコンをコミット
git add public/{icon-*,apple-touch-icon.png}

# コミットメッセージ例
git commit -m "chore: update logo and regenerate PWA icons

- Replace original.png with new design
- Regenerate all PWA icons from updated logo"
```

## 検証方法

### ブラウザでの確認

1. **Chrome/Edge DevTools**:
   - DevTools を開く (F12)
   - Application タブ → Manifest
   - アイコンが正しく表示されているか確認

2. **Safari Web Inspector**:
   - 開発メニュー → Web Inspector
   - Storage タブ → Manifest
   - apple-touch-icon が正しく設定されているか確認

### モバイルデバイスでの確認

1. **Android**:
   - Chrome でサイトを開く
   - メニュー → ホーム画面に追加
   - アイコンの表示を確認

2. **iOS**:
   - Safari でサイトを開く
   - 共有ボタン → ホーム画面に追加
   - apple-touch-icon が正しく表示されるか確認

## トラブルシューティング

### アイコンが表示されない

**原因**:

- ファイルパスが間違っている
- manifest.json の設定が不正
- キャッシュが残っている

**解決方法**:

```bash
# manifest.json を確認
cat public/manifest.json

# 開発サーバーを再起動
pnpm env:run -- pnpm dev

# ブラウザのキャッシュをクリア
# Chrome: DevTools > Application > Clear storage
```

### アイコンの品質が低い

**原因**:

- 元画像の解像度が低い
- 元画像が正方形でない

**解決方法**:

```bash
# 元画像のサイズを確認
file assets/logos/original.png

# 推奨: 1024x1024 以上の正方形画像を使用
# ImageMagick でリサイズする例:
convert original.png -resize 1024x1024 -gravity center -extent 1024x1024 original.png
```

### Maskable Icons が正しく表示されない

**原因**:

- セーフゾーンに重要な要素が配置されている

**解決方法**:

1. [Maskable.app](https://maskable.app/) でデザインを確認
2. 元画像を調整して重要な要素を中央80%に収める
3. アイコンを再生成

## ベストプラクティス

1. **高解像度の元画像を維持**:
   - 1024x1024 以上を推奨
   - 将来的なサイズ追加に対応可能

2. **正方形のロゴを使用**:
   - 非正方形の場合、自動的に中央配置されるが品質が低下する可能性

3. **シンプルなデザイン**:
   - 小さいサイズでも識別可能なデザイン
   - 細かいディテールは避ける

4. **背景透過の活用**:
   - PNG形式でアルファチャンネルを使用
   - 様々な背景色に対応可能

5. **定期的な確認**:
   - ロゴ更新時は必ず実機で表示確認
   - Android/iOS 両方で動作確認

## 参考リンク

- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons - web.dev](https://web.dev/maskable-icon/)
- [Add to Home Screen - iOS](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Adaptive Icons - Android](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
