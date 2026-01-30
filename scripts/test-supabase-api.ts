#!/usr/bin/env tsx
/**
 * Supabase API 動作確認スクリプト
 *
 * 使い方:
 *   pnpm env:run -- tsx scripts/test-supabase-api.ts
 */

interface TestResult {
  name: string
  success: boolean
}

interface ProjectInfo {
  id: string
  name: string
  region: string
  status: string
  database: {
    version: string
  }
}

/**
 * 必要な環境変数をチェック
 */
function checkEnv(): {
  token: string
  ref: string
  url: string
  key: string
} {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref = process.env.SUPABASE_PROJECT_REF
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing = []
  if (!token) missing.push('SUPABASE_ACCESS_TOKEN')
  if (!ref) missing.push('SUPABASE_PROJECT_REF')
  if (!url) missing.push('SUPABASE_URL')
  if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    console.error('❌ 必要な環境変数が不足しています:')
    for (const name of missing) {
      console.error(`  - ${name}`)
    }
    process.exit(1)
  }

  return { token: token!, ref: ref!, url: url!, key: key! }
}

/**
 * プロジェクト情報の取得をテスト
 */
async function testProjectInfo(token: string, ref: string): Promise<boolean> {
  console.log('\n1. Project Info API')
  console.log('='.repeat(60))

  const url = `https://api.supabase.com/v1/projects/${ref}`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'KeepOn-Test/1.0',
      },
    })

    if (!response.ok) {
      console.log(`❌ 失敗 (HTTP ${response.status})`)
      const text = await response.text()
      console.log(`   Response: ${text}`)
      return false
    }

    const data = (await response.json()) as ProjectInfo
    console.log(`✅ 成功 (Status: ${response.status})`)
    console.log(`   Project: ${data.name}`)
    console.log(`   Region: ${data.region}`)
    console.log(`   Status: ${data.status}`)
    console.log(`   PostgreSQL: ${data.database.version}`)
    return true
  } catch (error) {
    console.log(`❌ エラー: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * REST API スキーマの取得をテスト
 */
async function testRestSchema(url: string, key: string): Promise<string[] | null> {
  console.log('\n2. REST API Schema')
  console.log('='.repeat(60))

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    if (!response.ok) {
      console.log(`❌ 失敗 (HTTP ${response.status})`)
      const text = await response.text()
      console.log(`   Response: ${text}`)
      return null
    }

    const data = (await response.json()) as { paths: Record<string, unknown> }
    const tables = Object.keys(data.paths)
      .map((p) => p.replace(/^\//, ''))
      .filter((p) => p && !p.startsWith('rpc/'))

    console.log(`✅ 成功 (Status: ${response.status})`)
    console.log(`   Available tables (${tables.length}):`)
    for (const table of tables.sort()) {
      console.log(`     - ${table}`)
    }
    return tables
  } catch (error) {
    console.log(`❌ エラー: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * テーブルアクセスをテスト
 */
async function testTableAccess(url: string, key: string, table: string): Promise<boolean> {
  console.log(`\n3. Table Access Test: ${table}`)
  console.log('='.repeat(60))

  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
      },
    })

    if (!response.ok) {
      console.log(`❌ 失敗 (HTTP ${response.status})`)
      const text = await response.text()
      try {
        const errorData = JSON.parse(text) as { code?: string; message?: string }
        console.log(`   Error: ${errorData.message || 'Unknown error'}`)
        if (errorData.code === '42501') {
          console.log('   ℹ️  RLS (Row Level Security) が有効で、アクセスが拒否されています')
          console.log('      → Supabase Dashboard で RLS ポリシーを確認してください')
        }
      } catch {
        console.log(`   Response: ${text}`)
      }
      return false
    }

    const count = response.headers.get('Content-Range') || 'unknown'
    const data = (await response.json()) as Array<Record<string, unknown>>
    console.log(`✅ 成功 (Status: ${response.status})`)
    console.log(`   Total count: ${count}`)
    console.log(`   Sample records: ${data.length}`)
    if (data.length > 0) {
      console.log(`   First record keys: ${Object.keys(data[0]).join(', ')}`)
    }
    return true
  } catch (error) {
    console.log(`❌ エラー: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * RPC (Database Functions) のテストを試行
 */
async function testRpcCall(url: string, key: string): Promise<boolean> {
  console.log('\n4. RPC (Database Functions)')
  console.log('='.repeat(60))

  try {
    const response = await fetch(`${url}/rest/v1/rpc/version`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    if (!response.ok) {
      console.log(`⚠️  スキップ (HTTP ${response.status})`)
      console.log('   ℹ️  RPC 関数が未定義、またはアクセスできません')
      return false
    }

    const data = await response.json()
    console.log(`✅ 成功 (Status: ${response.status})`)
    console.log(`   Response: ${JSON.stringify(data)}`)
    return true
  } catch (error) {
    console.log(`⚠️  スキップ: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('='.repeat(60))
  console.log('Supabase API 動作確認スクリプト')
  console.log('='.repeat(60))

  // 環境変数チェック
  const { token, ref, url, key } = checkEnv()

  const results: TestResult[] = []

  // 1. Project Info
  results.push({
    name: 'Project Info',
    success: await testProjectInfo(token, ref),
  })

  // 2. REST Schema
  const tables = await testRestSchema(url, key)
  results.push({
    name: 'REST Schema',
    success: tables !== null,
  })

  // 3. Table Access (最初のテーブルをテスト)
  if (tables && tables.length > 0) {
    const testTable = tables[0]
    results.push({
      name: `Table Access (${testTable})`,
      success: await testTableAccess(url, key, testTable),
    })
  }

  // 4. RPC (オプショナル)
  results.push({
    name: 'RPC Functions',
    success: await testRpcCall(url, key),
  })

  // 結果サマリー
  console.log('\n' + '='.repeat(60))
  console.log('テスト結果サマリー')
  console.log('='.repeat(60))
  for (const { name, success } of results) {
    const status = success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${name}`)
  }

  const passed = results.filter((r) => r.success).length
  const total = results.length
  console.log(`\n合計: ${passed}/${total} 成功`)

  if (passed < total) {
    console.log('\n⚠️  一部のテストが失敗しました。')
    console.log('   詳細は上記のログを確認してください。')
  }
}

main().catch((error) => {
  console.error('予期しないエラーが発生しました:', error)
  process.exit(1)
})
