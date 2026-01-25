#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const INPUT_SVG = join(projectRoot, 'assets/logos/logo.svg')
const OUTPUT_PNG = join(projectRoot, 'assets/logos/original.png')
const SIZE = 1024

async function convertSvgToPng() {
  console.log('🎨 SVG → PNG 変換開始...\n')

  try {
    // SVGファイルを読み込み
    const svgBuffer = readFileSync(INPUT_SVG)

    // 1024x1024の透過PNGに変換
    await sharp(svgBuffer)
      .resize(SIZE, SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // 透過背景
      })
      .png()
      .toFile(OUTPUT_PNG)

    console.log(`✅ ${OUTPUT_PNG} (${SIZE}x${SIZE}, 透過背景)`)
    console.log('\n✨ 変換完了!')
    console.log('\n📝 次のステップ:')
    console.log('   node scripts/generate-pwa-icons.mjs')
  } catch (error) {
    console.error('❌ 変換エラー:', error.message)
    process.exit(1)
  }
}

convertSvgToPng()
