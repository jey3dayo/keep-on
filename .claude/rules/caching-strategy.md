# キャッシュ戦略

## 概要

KeepOn アプリケーションでは、パフォーマンス最適化のために複数のキャッシュ層を使用しています。

## キャッシュ層の構成

### 1. HTTPキャッシュヘッダー（エッジキャッシュ）

**設定場所**: `next.config.ts` の `headers()` 関数

#### 静的アセット

| パス              | Cache-Control                         | 用途                         |
| ----------------- | ------------------------------------- | ---------------------------- |
| `/_next/static/*` | `public, max-age=31536000, immutable` | Next.js ビルド済みアセット   |
| `/manifest.json`  | `public, max-age=86400`               | PWA マニフェスト（1日）      |
| `/sw.js`          | `public, max-age=0, must-revalidate`  | Service Worker（常に再検証） |

#### 動的コンテンツ

| パス          | Cache-Control               | 用途                           |
| ------------- | --------------------------- | ------------------------------ |
| `/:path*`     | `no-store, max-age=0`       | デフォルト（キャッシュしない） |
| `/api/:path*` | `no-cache, must-revalidate` | API エンドポイント             |

**特徴**:

- Cloudflare Workers のエッジキャッシュを活用
- `CDN-Cache-Control` ヘッダーで CDN 側のキャッシュも制御

### 2. Cloudflare KV キャッシュ

**実装場所**: `src/lib/cache/`

#### Habit Cache（習慣キャッシュ）

**ファイル**: `src/lib/cache/habit-cache.ts`

| 項目       | 設定                                       |
| ---------- | ------------------------------------------ |
| TTL        | 180秒（3分）                               |
| キー形式   | `habits:user:{userId}`                     |
| データ構造 | `{ habits, dateKey, timestamp, staleAt? }` |

**キャッシュ戦略**:

- `dateKey` によるバージョン管理（日付が変わるとミス）
- `staleAt` フィールドで明示的な無効化をサポート
- スキーマバリデーション（Valibot）で型安全性を保証

**キャッシュヒット条件**:

1. キャッシュが存在する
2. `dateKey` が一致する（同じ日付）
3. `staleAt` が未設定（無効化されていない）

**無効化タイミング**:

- チェックイン実行後（`invalidateHabitsCache()`）
- 習慣の作成・更新・削除後
- 日付が変わったとき（自動）

#### Analytics Cache（アナリティクスキャッシュ）

**ファイル**: `src/lib/cache/analytics-cache.ts`

| 項目       | 設定                                |
| ---------- | ----------------------------------- |
| TTL        | 300秒（5分）                        |
| キー形式   | `analytics:total-checkins:{userId}` |
| データ構造 | `number`（総チェックイン数）        |

**キャッシュ戦略**:

- 総チェックイン数のみをキャッシュ
- チェックイン実行後に即座に無効化

**無効化タイミング**:

- チェックイン実行後（`invalidateAnalyticsCache()`）

### 3. Next.js Data Cache

**Next.js 16 の fetch キャッシュ**:

- デフォルトで `cache: 'no-store'`（キャッシュしない）
- 動的データのみを扱うため、積極的なキャッシュは行わない

## キャッシュキーの命名規則

### プレフィックス命名

| プレフィックス              | 用途                 |
| --------------------------- | -------------------- |
| `habits:user:{userId}`      | ユーザーの習慣データ |
| `analytics:total-checkins:` | 総チェックイン数     |

**ルール**:

- コロン (`:`) で区切る
- 階層構造を表現（`{カテゴリ}:{サブカテゴリ}:{ID}`）
- プレフィックスは定数化（`src/constants/cache.ts`）

## キャッシュ無効化戦略

### 無効化パターン

#### 1. Stale-While-Revalidate（習慣キャッシュ）

```typescript
// staleAt フィールドで無効化をマーク
const staleData = { ...data, staleAt: Date.now() };
await kv.put(key, JSON.stringify(staleData), {
  expirationTtl: CACHE_TTL_SECONDS,
});
```

**特徴**:

- キャッシュは残すが、次回アクセス時に再取得
- 古いデータを読み取るリスクを最小化

#### 2. Immediate Delete（アナリティクスキャッシュ）

```typescript
await kv.delete(key);
```

**特徴**:

- キャッシュを即座に削除
- 次回アクセス時に必ず再取得

### 無効化のトリガー

| アクション       | 無効化対象                     |
| ---------------- | ------------------------------ |
| チェックイン実行 | Habit Cache, Analytics Cache   |
| 習慣作成         | Habit Cache                    |
| 習慣更新         | Habit Cache                    |
| 習慣削除         | Habit Cache                    |
| 日付変更         | 自動（`dateKey` 不一致でミス） |

## パフォーマンス目標

### キャッシュヒット率

| キャッシュ層               | 目標ヒット率 |
| -------------------------- | ------------ |
| Cloudflare Edge            | 80% 以上     |
| KV Cache（習慣）           | 60% 以上     |
| KV Cache（アナリティクス） | 70% 以上     |

### レスポンスタイム

| エンドポイント   | 目標時間 |
| ---------------- | -------- |
| `/dashboard`     | < 500ms  |
| `/habits`        | < 500ms  |
| チェックイン API | < 300ms  |

## 監視とデバッグ

### ログの確認

キャッシュの動作は構造化ログで追跡可能：

```bash
# Cloudflare Workers ログ
pnpm cf:logs

# キャッシュヒット/ミスの確認
# habit-cache:hit, habit-cache:miss
# analytics-cache:hit, analytics-cache:miss
```

### Cloudflare Analytics

Cloudflare Dashboard → Analytics → Cache で確認：

- Cache Hit Rate
- Cache Hit Bytes
- Total Requests

## トラブルシューティング

### キャッシュが効かない

**原因**:

- ローカル環境では KV が利用できない
- `getKV()` が `null` を返す

**解決方法**:

- Cloudflare Workers 環境で動作確認
- `wrangler dev` で KV をバインド

### キャッシュが古いまま

**原因**:

- 無効化処理が実行されていない
- `dateKey` が更新されていない

**解決方法**:

- Server Actions で明示的に `invalidateHabitsCache()` を呼ぶ
- `revalidatePath()` も併用する

### スキーマバリデーションエラー

**原因**:

- キャッシュデータの構造が変更された
- Valibot スキーマと不一致

**解決方法**:

- キャッシュを手動削除（`wrangler kv:key delete`）
- スキーマ変更時は TTL を短縮して自動削除を待つ

## 関連ファイル

- `next.config.ts` - HTTP キャッシュヘッダー設定
- `src/lib/cache/habit-cache.ts` - 習慣キャッシュ実装
- `src/lib/cache/analytics-cache.ts` - アナリティクスキャッシュ実装
- `src/constants/cache.ts` - キャッシュ定数
- `src/schemas/cache.ts` - キャッシュスキーマ定義
