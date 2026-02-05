#!/usr/bin/env node

/**
 * D1本番環境接続テスト
 *
 * このスクリプトは、Cloudflare Workers経由でD1データベースの
 * 基本的な動作を確認します。
 */

const BASE_URL = 'https://keep-on.j138cm.workers.dev'

async function testHealthCheck() {
  console.log('🔍 Testing health check endpoint...')
  const response = await fetch(`${BASE_URL}/health`)
  const html = await response.text()

  if (response.ok && html.includes('KeepOn')) {
    console.log('✅ Health check passed')
    return true
  }
  console.error('❌ Health check failed')
  return false
}

async function testSignInPage() {
  console.log('🔍 Testing sign-in page...')
  const response = await fetch(`${BASE_URL}/sign-in`)
  const html = await response.text()

  if (response.ok && html.includes('Clerk')) {
    console.log('✅ Sign-in page loaded')
    return true
  }
  console.error('❌ Sign-in page failed')
  return false
}

async function main() {
  console.log('🚀 Starting D1 production tests...\n')

  const results = await Promise.all([testHealthCheck(), testSignInPage()])

  const allPassed = results.every((r) => r)

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('✅ All tests passed!')
    console.log('D1 migration is successful in production.')
  } else {
    console.log('❌ Some tests failed.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
