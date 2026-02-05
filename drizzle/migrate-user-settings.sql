-- 既存ユーザーデータを UserSettings テーブルに移行
-- 実行方法: pnpm db:migrate:local drizzle/migrate-user-settings.sql

INSERT INTO UserSettings (id, userId, weekStart, colorTheme, themeMode, createdAt, updatedAt)
SELECT
  lower(hex(randomblob(16))),
  id,
  weekStart,
  'teal',
  'system',
  datetime('now'),
  datetime('now')
FROM User
WHERE NOT EXISTS (
  SELECT 1 FROM UserSettings WHERE UserSettings.userId = User.id
);
