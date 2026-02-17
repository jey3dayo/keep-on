# Cloudflare Analytics ダッシュボード構築ガイド

## 概要

Cloudflare Workers のパフォーマンスメトリクスを可視化し、CPU Time、レイテンシ、エラー率を監視する。

## 前提条件

`wrangler.jsonc` で `observability` が有効化されています：

```jsonc
{
  "observability": {
    "enabled": true,
  },
}
```

これにより、Cloudflare Workers のメトリクスが自動的に収集されます。

---

## Cloudflare Dashboard での確認

### アクセス方法

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **keep-on** → **Metrics** タブ

### 確認できるメトリクス

| メトリクス       | 説明                         | 推奨値      |
| ---------------- | ---------------------------- | ----------- |
| **Requests**     | リクエスト数（時系列）       | -           |
| **Success Rate** | 成功率（2xx/3xx）            | > 99%       |
| **CPU Time**     | CPU 使用時間（P50, P99）     | P99 < 50ms  |
| **Duration**     | レスポンスタイム（P50, P99） | P99 < 500ms |
| **Errors**       | 5xx エラー数                 | < 1%        |

### パフォーマンス目標

| 指標         | 目標値  | 警告閾値 |
| ------------ | ------- | -------- |
| P50 CPU Time | < 10ms  | > 30ms   |
| P99 CPU Time | < 50ms  | > 100ms  |
| P99 Duration | < 500ms | > 1000ms |
| Success Rate | > 99%   | < 95%    |
| Error Rate   | < 1%    | > 5%     |

---

## アラート設定

### 推奨アラート

Cloudflare Dashboard で以下のアラートを設定：

#### 1. CPU Time 超過アラート

- **条件**: P99 CPU Time > 50ms
- **期間**: 5分間継続
- **通知先**: Email / Slack

#### 2. エラー率アラート

- **条件**: Error Rate > 5%
- **期間**: 1分間継続
- **通知先**: Email / Slack

#### 3. レスポンスタイムアラート

- **条件**: P99 Duration > 500ms
- **期間**: 5分間継続
- **通知先**: Email / Slack

### アラート設定手順

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Notifications** → **Create**
2. **Workers** カテゴリを選択
3. 条件と通知先を設定
4. **Save** をクリック

---

## Slack統合

### Webhook URL の取得

1. [Slack API](https://api.slack.com/apps) でアプリを作成
2. **Incoming Webhooks** を有効化
3. チャンネルを選択して Webhook URL を取得

### Cloudflare への設定

1. Cloudflare Dashboard → **Notifications** → **Destinations**
2. **Add destination** → **Webhook**
3. Slack Webhook URL を入力
4. テスト送信して動作確認

### 通知例

```
🚨 Alert: CPU Time Exceeded
Worker: keep-on
Metric: P99 CPU Time
Value: 75ms (threshold: 50ms)
Duration: 5 minutes
```

---

## GraphQL API によるメトリクス取得

### API トークンの作成

1. [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. Template: Analytics Read
3. Permissions: `Analytics:Read`
4. Account Resources: 該当アカウント
5. トークンをコピー

### サンプルクエリ

#### リクエスト数の取得

```graphql
query {
  viewer {
    accounts(filter: { accountTag: "YOUR_ACCOUNT_ID" }) {
      workersInvocationsAdaptive(
        filter: { scriptName: "keep-on" }
        limit: 100
        orderBy: [datetime_ASC]
      ) {
        dimensions {
          datetime
        }
        sum {
          requests
          errors
        }
        avg {
          cpuTime
          duration
        }
      }
    }
  }
}
```

#### CPU Time の取得

```graphql
query {
  viewer {
    accounts(filter: { accountTag: "YOUR_ACCOUNT_ID" }) {
      workersInvocationsAdaptive(
        filter: { scriptName: "keep-on" }
        limit: 100
      ) {
        quantiles {
          cpuTimeP50
          cpuTimeP99
          durationP50
          durationP99
        }
      }
    }
  }
}
```

### curl での実行例

```bash
curl -X POST https://api.cloudflare.com/client/v4/graphql \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { viewer { accounts(filter: { accountTag: \"YOUR_ACCOUNT_ID\" }) { workersInvocationsAdaptive(filter: { scriptName: \"keep-on\" } limit: 100) { sum { requests errors } avg { cpuTime duration } } } } }"
  }'
```

---

## Grafana ダッシュボード（オプション）

### 前提条件

- Grafana Cloud または Self-hosted Grafana
- Cloudflare API トークン（Analytics Read 権限）

### データソースの設定

1. Grafana → **Configuration** → **Data Sources** → **Add data source**
2. **JSON API** を選択（プラグインが必要な場合はインストール）
3. URL: `https://api.cloudflare.com/client/v4/graphql`
4. Custom HTTP Headers:
   - `Authorization: Bearer YOUR_API_TOKEN`

### パネル構成例

#### 1. リクエスト数（時系列）

- **クエリ**: GraphQL で `sum { requests }`
- **可視化**: Time series
- **Y軸**: リクエスト数

#### 2. CPU Time（ヒストグラム）

- **クエリ**: GraphQL で `quantiles { cpuTimeP50 cpuTimeP99 }`
- **可視化**: Stat panel
- **単位**: ms

#### 3. エラー率（時系列）

- **クエリ**: GraphQL で `sum { errors } / sum { requests } * 100`
- **可視化**: Time series
- **Y軸**: エラー率（%）

#### 4. レスポンスタイム（時系列）

- **クエリ**: GraphQL で `quantiles { durationP99 }`
- **可視化**: Time series
- **Y軸**: レスポンスタイム（ms）

---

## カスタムメトリクス

### Workers Analytics Engine の使用

Cloudflare Workers 内でカスタムメトリクスを送信：

#### 設定

`wrangler.jsonc` に追加：

```jsonc
{
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS",
    },
  ],
}
```

#### コード例

```typescript
// src/lib/analytics.ts
export function trackMetric(
  analytics: AnalyticsEngineDataset,
  name: string,
  value: number,
  metadata?: Record<string, string>,
) {
  analytics.writeDataPoint({
    blobs: [name],
    doubles: [value],
    indexes: metadata ? Object.values(metadata) : [],
  });
}
```

#### 使用例

```typescript
// Server Action での使用
import { trackMetric } from "@/lib/analytics";

export async function createHabitAction(formData: FormData) {
  const startTime = Date.now();

  try {
    const result = await createHabit(validInput);

    // 成功メトリクスを記録
    trackMetric(env.ANALYTICS, "habit.create.success", Date.now() - startTime, {
      userId: validInput.userId,
    });

    return result;
  } catch (error) {
    // エラーメトリクスを記録
    trackMetric(env.ANALYTICS, "habit.create.error", Date.now() - startTime);
    throw error;
  }
}
```

### 収集すべきメトリクス例

| メトリクス              | 説明                | 用途               |
| ----------------------- | ------------------- | ------------------ |
| `habit.create.duration` | 習慣作成の処理時間  | パフォーマンス監視 |
| `habit.create.success`  | 習慣作成の成功数    | 成功率計算         |
| `habit.create.error`    | 習慣作成の失敗数    | エラー率計算       |
| `db.query.duration`     | DB クエリの処理時間 | DB パフォーマンス  |
| `cache.hit`             | キャッシュヒット数  | キャッシュ効率     |
| `cache.miss`            | キャッシュミス数    | キャッシュ効率     |

---

## コスト分析

### CPU Time による課金

Cloudflare Workers は CPU Time で課金されます。

| プラン | 無料枠                | 超過料金       |
| ------ | --------------------- | -------------- |
| Free   | 100,000 リクエスト/日 | -              |
| Paid   | 10M CPU ms/月         | $0.02/M CPU ms |

### コスト最適化

1. P99 CPU Time を監視
   - 目標: < 50ms
   - 警告: > 100ms

2. 重い処理を最適化
   - DB クエリの最適化
   - 不要な処理の削減
   - キャッシュの活用

3. サンプリングレートの調整
   - Sentry のサンプリングレート: 10%
   - Analytics Engine のサンプリング: 100%（軽量）

### 月間コスト試算

| リクエスト数 | 平均 CPU Time | CPU Time 合計 | 超過分 | 月額 |
| ------------ | ------------- | ------------- | ------ | ---- |
| 100,000      | 10ms          | 1,000,000ms   | 0      | $0   |
| 1,000,000    | 10ms          | 10,000,000ms  | 0      | $0   |
| 10,000,000   | 10ms          | 100,000,000ms | 90M ms | $1.8 |

---

## モニタリングチェックリスト

### 日次確認

- [ ] エラー率が 1% 未満
- [ ] P99 CPU Time が 50ms 未満
- [ ] P99 Duration が 500ms 未満

### 週次確認

- [ ] リクエスト数の傾向
- [ ] エラーの種類と頻度
- [ ] パフォーマンスのリグレッション

### 月次確認

- [ ] CPU Time のコスト
- [ ] キャッシュヒット率
- [ ] データベースクエリの最適化

---

## トラブルシューティング

### メトリクスが表示されない

### 原因:

- `observability: { enabled: true }` が設定されていない
- Worker がデプロイされていない

### 解決方法:

```bash
# wrangler.jsonc を確認
cat wrangler.jsonc | grep observability

# 再デプロイ
pnpm build:cf
pnpm wrangler deploy
```

### CPU Time が高い

### 調査方法:

1. Cloudflare Dashboard で P99 CPU Time を確認
2. Sentry でスロークエリを特定
3. `wrangler tail` でリアルタイムログを確認

### 最適化:

- DB クエリのインデックス追加
- 不要な処理の削減
- キャッシュの活用

### エラー率が高い

### 調査方法:

1. Sentry でエラー内容を確認
2. `wrangler tail` でエラーログを確認
3. Cloudflare Dashboard でエラー種別を確認

### 対処:

- エラーハンドリングの改善
- リトライロジックの追加
- タイムアウト設定の調整

---

## 参考リンク

- [Cloudflare Workers Analytics](https://developers.cloudflare.com/workers/observability/analytics-engine/)
- [Cloudflare GraphQL API](https://developers.cloudflare.com/api/operations/workers-analytics-get-analytics)
- [Grafana Cloudflare Integration](https://grafana.com/grafana/plugins/cloudflare-cloudflare-datasource/)
- [Workers Observability](https://developers.cloudflare.com/workers/observability/)
