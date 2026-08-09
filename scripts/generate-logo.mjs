#!/usr/bin/env node
/**
 * KeepOn ブランドマーク / アプリアイコンの生成元。
 *
 * 意匠は ultra-rss-reader のアプリアイコンと同一ファミリー:
 *   - 角丸プレート + ソフトな押し出し表現（ダーク版）
 *   - ミュートティール × ウォームアンバーの2色構成
 *   - 左に静的な要素、右にアクセント色の主役グリフ
 *
 * 出力（すべて生成物。直接編集せずこのスクリプトを更新すること）:
 *   assets/logos/logo.svg          マーク単体（透過・UI 埋め込み用）
 *   assets/logos/original.png      アプリアイコン ダーク版 1024（PWA アイコンの元画像）
 *   assets/logos/app-icon-light.png アプリアイコン ライト版 1024
 *   public/logo.svg, public/favicon.svg
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- brand palette ---------------------------------------------------------
const TEAL = { base: '#4E8794', hi: '#6FA9B4', lo: '#2E5A65' }
const AMBER = { base: '#D08A45', hi: '#E8AE72', lo: '#9A5F27' }
const INK = { base: '#33415C', hi: '#4A5B7A', lo: '#222C41' }

// --- mark (transparent, 3:2) ----------------------------------------------
const MARK = `
  <rect x="13" y="17" width="40" height="11" rx="5.5" fill="${TEAL.base}"/>
  <rect x="13" y="34.5" width="50" height="11" rx="5.5" fill="${TEAL.base}"/>
  <rect x="13" y="52" width="40" height="11" rx="5.5" fill="${TEAL.base}"/>
  <path d="M69 44 L79 54 L101 26" fill="none" stroke="${AMBER.base}"
        stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="120" height="80" role="img" aria-labelledby="keepon-logo-title">
  <title id="keepon-logo-title">KeepOn</title>${MARK}
</svg>
`

// --- app icon --------------------------------------------------------------
const gradient = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="${c.hi}"/><stop offset="0.45" stop-color="${c.base}"/><stop offset="1" stop-color="${c.lo}"/>
  </linearGradient>`

/** マークを 1024 キャンバス向けに拡大したグリフ。plate=true でプレート内の安全域に収める。 */
const glyph = (tealFill, amberFill) => `
  <rect x="206" y="452" width="286" height="78" rx="39" fill="${tealFill}"/>
  <rect x="206" y="583" width="350" height="78" rx="39" fill="${tealFill}"/>
  <rect x="206" y="714" width="286" height="78" rx="39" fill="${tealFill}"/>
  <path d="M560 604 L646 694 L822 414" fill="none" stroke="${amberFill}"
        stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/>`

const darkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#262b33"/><stop offset="1" stop-color="#14171c"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.10"/>
    </linearGradient>
    ${gradient('teal', TEAL)}${gradient('amber', AMBER)}
    <filter id="drop" x="-30%" y="-30%" width="180%" height="180%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/>
    </filter>
    <filter id="soft" x="-40%" y="-40%" width="200%" height="200%">
      <feDropShadow dx="0" dy="26" stdDeviation="30" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#soft)"><rect x="96" y="96" width="832" height="832" rx="196" fill="url(#plate)"/></g>
  <rect x="97.5" y="97.5" width="829" height="829" rx="195" fill="none" stroke="url(#rim)" stroke-width="3"/>
  <g filter="url(#drop)">${glyph('url(#teal)', 'url(#amber)')}</g>
</svg>
`

// ライト版はプレートを持たずフルブリード（ultra-rss-reader の light 版と同じ扱い）
const lightIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#F4F6F8"/><stop offset="1" stop-color="#DDE3EA"/>
    </linearGradient>
    ${gradient('ink', INK)}${gradient('amber', AMBER)}
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${glyph('url(#ink)', 'url(#amber)')}
</svg>
`

const write = async (relPath, svg, { raster } = {}) => {
  const out = join(projectRoot, relPath)
  if (raster) {
    await sharp(Buffer.from(svg)).png().toFile(out)
  } else {
    writeFileSync(out, svg)
  }
  console.log(`  ✓ ${relPath}`)
}

console.log('🎨 KeepOn ロゴ生成...\n')
await write('assets/logos/logo.svg', markSvg)
await write('public/logo.svg', markSvg)
await write('public/favicon.svg', markSvg)
await write('assets/logos/app-icon.svg', darkIconSvg)
await write('assets/logos/app-icon-light.svg', lightIconSvg)
await write('assets/logos/original.png', darkIconSvg, { raster: true })
await write('assets/logos/app-icon-light.png', lightIconSvg, { raster: true })
console.log('\n次に `node scripts/generate-pwa-icons.mjs` で PWA アイコンを再生成すること。')
