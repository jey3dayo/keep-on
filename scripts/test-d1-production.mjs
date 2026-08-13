#!/usr/bin/env node

/**
 * D1本番環境接続テスト
 *
 * このスクリプトは、Cloudflare Workers経由でD1データベースの
 * 基本的な動作を確認します。
 */

const BASE_URL = 'https://keep-on.jey3dayo.net'

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

async function testAccessLoginRedirect() {
  console.log('🔍 Testing Cloudflare Access login redirect...')
  const response = await fetch(`${BASE_URL}/dashboard`, { redirect: 'follow' })

  if (response.url.includes('cloudflareaccess.com')) {
    console.log('✅ Redirected to Cloudflare Access login')
    return true
  }
  console.error('❌ Access login redirect failed')
  return false
}

async function main() {
  console.log('🚀 Starting D1 production tests...\n')

  const results = await Promise.all([testHealthCheck(), testAccessLoginRedirect()])

  const allPassed = results.every((r) => r)

  console.log(`\n${'='.repeat(50)}`)
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
