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

interface RlsStatus {
  tablename: string
  rowsecurity: boolean
}

type GrantsByTable = Record<string, Record<string, string[]>>
type SqlClient = ReturnType<typeof postgres>

const divider = '='.repeat(60)

function logHeader(title: string): void {
  console.log(divider)
  console.log(title)
  console.log(divider)
}

function logSection(title: string): void {
  console.log(`\n${title}`)
  console.log(divider)
}

function logDividerTitle(title: string): void {
  console.log(`\n${divider}`)
  console.log(title)
  console.log(divider)
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

async function fetchTables(sql: SqlClient): Promise<TableInfo[]> {
  return await sql<TableInfo[]>`
    SELECT schemaname, tablename, tableowner
    FROM pg_tables
    WHERE tablename IN ('User', 'Habit', 'Checkin')
    ORDER BY tablename
  `
}

function printTables(tables: TableInfo[]): void {
  if (tables.length === 0) {
    console.log('❌ テーブルが見つかりませんでした')
    return
  }

  console.log(`✅ テーブル: ${tables.length}件`)
  for (const table of tables) {
    console.log(`   - ${table.schemaname}.${table.tablename} (owner: ${table.tableowner})`)
  }
}

async function fetchRoles(sql: SqlClient): Promise<RoleInfo[]> {
  return await sql<RoleInfo[]>`
    SELECT rolname, rolbypassrls
    FROM pg_roles
    WHERE rolname IN ('service_role', 'authenticator', 'postgres')
    ORDER BY rolname
  `
}

function printRoles(roles: RoleInfo[]): void {
  for (const role of roles) {
    const bypass = role.rolbypassrls ? '✅ YES' : '❌ NO'
    console.log(`   ${role.rolname}: RLS Bypass = ${bypass}`)
  }
}

async function fetchGrants(sql: SqlClient): Promise<GrantInfo[]> {
  return await sql<GrantInfo[]>`
    SELECT grantee, privilege_type, table_name
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name IN ('User', 'Habit', 'Checkin')
    AND grantee IN ('service_role', 'authenticator', 'postgres')
    ORDER BY table_name, grantee, privilege_type
  `
}

function groupGrants(grants: GrantInfo[]): GrantsByTable {
  const byTable: GrantsByTable = {}

  for (const grant of grants) {
    if (!byTable[grant.table_name]) {
      byTable[grant.table_name] = {}
    }
    if (!byTable[grant.table_name][grant.grantee]) {
      byTable[grant.table_name][grant.grantee] = []
    }
    byTable[grant.table_name][grant.grantee].push(grant.privilege_type)
  }

  return byTable
}

function printGrants(grants: GrantInfo[]): void {
  if (grants.length === 0) {
    console.log('❌ 権限が見つかりませんでした')
    return
  }

  const byTable = groupGrants(grants)
  for (const [tableName, roleGrants] of Object.entries(byTable)) {
    console.log(`\n   ${tableName}:`)
    for (const [role, privileges] of Object.entries(roleGrants)) {
      console.log(`     ${role}: ${privileges.join(', ')}`)
    }
  }
}

async function fetchRlsStatus(sql: SqlClient): Promise<RlsStatus[]> {
  return await sql<RlsStatus[]>`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('User', 'Habit', 'Checkin')
    ORDER BY tablename
  `
}

function printRlsStatus(rlsStatus: RlsStatus[]): void {
  for (const table of rlsStatus) {
    const status = table.rowsecurity ? '🔒 有効' : '🔓 無効'
    console.log(`   ${table.tablename}: ${status}`)
  }
}

function printDiagnosis(roles: RoleInfo[], grants: GrantInfo[]): void {
  const serviceRoleInfo = roles.find((role) => role.rolname === 'service_role')
  const hasServiceRoleGrants = grants.some((grant) => grant.grantee === 'service_role')

  if (!serviceRoleInfo) {
    console.log('❌ service_role が見つかりません')
    return
  }

  if (!serviceRoleInfo.rolbypassrls) {
    console.log('⚠️  service_role が RLS をバイパスしていません')
    console.log('   → 以下の SQL を実行して修正してください:')
    console.log('')
    console.log('   ALTER ROLE service_role BYPASSRLS;')
    return
  }

  if (hasServiceRoleGrants) {
    console.log('✅ service_role の設定は正常です')
    return
  }

  console.log('⚠️  service_role にテーブルへの権限がありません')
  console.log('   → 以下の SQL を実行して修正してください:')
  console.log('')
  console.log('   GRANT USAGE ON SCHEMA public TO service_role;')
  console.log('   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;')
  console.log('   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;')
  console.log('   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;')
}

function printRecommendedSql(): void {
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
}

/**
 * メイン処理
 */
async function main() {
  logHeader('Supabase DB 権限確認スクリプト')

  const databaseUrl = checkEnv()

  // postgres-js クライアントを作成
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  try {
    logSection('1. テーブル情報')
    const tables = await fetchTables(sql)
    printTables(tables)

    logSection('2. service_role の情報')
    const roles = await fetchRoles(sql)
    printRoles(roles)

    logSection('3. テーブル権限')
    const grants = await fetchGrants(sql)
    printGrants(grants)

    logSection('4. Row Level Security (RLS) の状態')
    const rlsStatus = await fetchRlsStatus(sql)
    printRlsStatus(rlsStatus)

    logDividerTitle('診断結果')
    printDiagnosis(roles, grants)

    logDividerTitle('推奨される修正 SQL（必要な場合のみ実行）')
    printRecommendedSql()
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
