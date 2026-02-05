/**
 * 既存ユーザーデータを UserSettings テーブルに移行
 *
 * 実行方法:
 * DOTENV_PRIVATE_KEY=$(rg -N '^DOTENV_PRIVATE_KEY=' .env.keys | cut -d= -f2-) \
 * pnpm dotenvx run -- tsx scripts/migrate-user-settings.ts
 */

import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { userSettings, users } from '@/db/schema'
import { getDb } from '@/lib/db'

async function main() {
  console.log('Starting user settings migration...')

  const db = getDb()

  // 既存のユーザーを取得
  const existingUsers = await db.select().from(users)

  console.log(`Found ${existingUsers.length} users`)

  let migrated = 0
  let skipped = 0

  for (const user of existingUsers) {
    // 既に UserSettings が存在するかチェック
    const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id))

    if (existing) {
      console.log(`Skipping user ${user.id} (settings already exist)`)
      skipped++
      continue
    }

    // UserSettings を作成
    await db.insert(userSettings).values({
      id: createId(),
      userId: user.id,
      weekStart: user.weekStart,
      colorTheme: 'teal',
      themeMode: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    console.log(`Migrated user ${user.id}`)
    migrated++
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`)
}

main()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
