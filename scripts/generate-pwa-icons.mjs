#!/usr/bin/env node

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const INPUT_LOGO = join(projectRoot, 'assets/logos/pwa-icon.svg')
const OUTPUT_DIR = join(projectRoot, 'public')

const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

async function generateIcons() {
  console.log('🎨 PWAアイコン生成開始...\n')

  for (const { name, size } of icons) {
    const outputPath = join(OUTPUT_DIR, name)

    try {
      // PWAマスターはフルブリードなので、通常版・maskable版とも追加の
      // 縮小やextendを行わず、同じ意匠を出力サイズへ直接リサイズする。
      await sharp(INPUT_LOGO).resize(size, size, { fit: 'fill' }).png().toFile(outputPath)

      console.log(`✅ ${name} (${size}x${size})`)
    } catch (error) {
      console.error(`❌ ${name} 生成失敗:`, error.message)
      process.exit(1)
    }
  }

  console.log('\n✨ PWAアイコン生成完了!')
}

generateIcons()
