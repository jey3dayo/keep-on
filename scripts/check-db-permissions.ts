#!/usr/bin/env tsx
/**
 * Supabase DB 権限確認スクリプト
 *
 * 使い方:
 *   pnpm test:db-permissions
 */

import postgres from 'postgres'

interface TableInfo {
  schemaname: string
  tablename: string
  tableowner: string
}

interface RoleInfo {
  rolname: string
  rolbypassrls: boolean
}

interface GrantInfo {
  grantee: string
  privilege_type: string
  table_name: string
}

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
  console.log('Supabase DB 権限確認スクリプト')
  console.log('='.repeat(60))

  const databaseUrl = checkEnv()

  // postgres-js クライアントを作成
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  try {
    // 1. テーブルの存在とスキーマを確認
    console.log('\n1. テーブル情報')
    console.log('='.repeat(60))

    const tables = await sql<TableInfo[]>`
      SELECT schemaname, tablename, tableowner
      FROM pg_tables
      WHERE tablename IN ('User', 'Habit', 'Checkin')
      ORDER BY tablename
    `

    if (tables.length === 0) {
      console.log('❌ テーブルが見つかりませんでした')
    } else {
      console.log(`✅ テーブル: ${tables.length}件`)
      for (const table of tables) {
        console.log(`   - ${table.schemaname}.${table.tablename} (owner: ${table.tableowner})`)
      }
    }

    // 2. service_role の権限を確認
    console.log('\n2. service_role の情報')
    console.log('='.repeat(60))

    const roles = await sql<RoleInfo[]>`
      SELECT rolname, rolbypassrls
      FROM pg_roles
      WHERE rolname IN ('service_role', 'authenticator', 'postgres')
      ORDER BY rolname
    `

    for (const role of roles) {
      const bypass = role.rolbypassrls ? '✅ YES' : '❌ NO'
      console.log(`   ${role.rolname}: RLS Bypass = ${bypass}`)
    }

    // 3. テーブルごとの権限を確認
    console.log('\n3. テーブル権限')
    console.log('='.repeat(60))

    const grants = await sql<GrantInfo[]>`
      SELECT grantee, privilege_type, table_name
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
      AND table_name IN ('User', 'Habit', 'Checkin')
      AND grantee IN ('service_role', 'authenticator', 'postgres')
      ORDER BY table_name, grantee, privilege_type
    `

    if (grants.length === 0) {
      console.log('❌ 権限が見つかりませんでした')
    } else {
      // テーブルごとにグループ化
      const byTable = grants.reduce(
        (acc, grant) => {
          if (!acc[grant.table_name]) {
            acc[grant.table_name] = {}
          }
          if (!acc[grant.table_name][grant.grantee]) {
            acc[grant.table_name][grant.grantee] = []
          }
          acc[grant.table_name][grant.grantee].push(grant.privilege_type)
          return acc
        },
        {} as Record<string, Record<string, string[]>>
      )

      for (const [tableName, roleGrants] of Object.entries(byTable)) {
        console.log(`\n   ${tableName}:`)
        for (const [role, privileges] of Object.entries(roleGrants)) {
          console.log(`     ${role}: ${privileges.join(', ')}`)
        }
      }
    }

    // 4. RLS の状態を確認
    console.log('\n4. Row Level Security (RLS) の状態')
    console.log('='.repeat(60))

    const rlsStatus = await sql<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('User', 'Habit', 'Checkin')
      ORDER BY tablename
    `

    for (const table of rlsStatus) {
      const status = table.rowsecurity ? '🔒 有効' : '🔓 無効'
      console.log(`   ${table.tablename}: ${status}`)
    }

    // 5. 診断結果
    console.log('\n' + '='.repeat(60))
    console.log('診断結果')
    console.log('='.repeat(60))

    const serviceRoleInfo = roles.find((r) => r.rolname === 'service_role')
    const hasServiceRoleGrants = grants.some((g) => g.grantee === 'service_role')

    if (!serviceRoleInfo) {
      console.log('❌ service_role が見つかりません')
    } else if (!serviceRoleInfo.rolbypassrls) {
      console.log('⚠️  service_role が RLS をバイパスしていません')
      console.log('   → 以下の SQL を実行して修正してください:')
      console.log('')
      console.log('   ALTER ROLE service_role BYPASSRLS;')
    } else if (hasServiceRoleGrants) {
      console.log('✅ service_role の設定は正常です')
    } else {
      console.log('⚠️  service_role にテーブルへの権限がありません')
      console.log('   → 以下の SQL を実行して修正してください:')
      console.log('')
      console.log('   GRANT USAGE ON SCHEMA public TO service_role;')
      console.log('   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;')
      console.log('   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;')
      console.log('   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;')
    }

    // 6. 推奨される修正SQL
    console.log('\n' + '='.repeat(60))
    console.log('推奨される修正 SQL（必要な場合のみ実行）')
    console.log('='.repeat(60))
    console.log(`
-- service_role に RLS バイパス権限を付与
ALTER ROLE service_role BYPASSRLS;

-- public スキーマへのアクセス権限を付与
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 将来作成されるテーブルにも権限を自動付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
`)
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
