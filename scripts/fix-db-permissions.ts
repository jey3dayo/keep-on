#!/usr/bin/env tsx
/**
 * Supabase DB 権限修正スクリプト
 *
 * 使い方:
 *   pnpm fix:db-permissions
 */

import postgres from 'postgres'

/**
 * 環境変数をチェック
 */
function checkEnv(): string {
  const url = process.env.DATABASE_URL

  if (!url) {
    console.error('❌ DATABASE_URL が設定されていません')
    process.exit(1)
  }

  return url
}

/**
 * メイン処理
 */
async function main() {
  console.log('='.repeat(60))
  console.log('Supabase DB 権限修正スクリプト')
  console.log('='.repeat(60))

  const databaseUrl = checkEnv()

  // postgres-js クライアントを作成
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  try {
    console.log('\n1. service_role の RLS バイパス権限')
    console.log('='.repeat(60))
    console.log('ℹ️  service_role はデフォルトで RLS バイパス権限を持っています')
    console.log('   （Supabase の予約ロールのため変更不要）')

    console.log('\n2. public スキーマへのアクセス権限を付与')
    console.log('='.repeat(60))

    await sql`GRANT USAGE ON SCHEMA public TO service_role`
    console.log('✅ GRANT USAGE ON SCHEMA public TO service_role')

    await sql`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role`
    console.log('✅ GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role')

    await sql`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role`
    console.log('✅ GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role')

    console.log('\n3. 将来作成されるテーブルにも権限を自動付与')
    console.log('='.repeat(60))

    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role`
    console.log('✅ ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role')

    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role`
    console.log('✅ ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role')

    console.log(`\n${'='.repeat(60)}`)
    console.log('✅ すべての権限修正が完了しました')
    console.log('='.repeat(60))

    console.log('\n次のステップ:')
    console.log('  pnpm test:db-permissions  # 権限を再確認')
    console.log('  pnpm test:supabase        # Supabase API をテスト')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('予期しないエラーが発生しました:', error)
  process.exit(1)
})
