/**
 * シリアライズ可能な設定エラー型
 * Server ActionのレスポンスとしてRSC経由でクライアントに渡せる
 */
export type SerializableSettingsError =
  | { name: 'UnauthorizedError'; message: string }
  | { name: 'DatabaseError'; message: string }
