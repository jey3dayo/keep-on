#!/usr/bin/env node

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const INPUT_LOGO = join(projectRoot, 'assets/logos/original.png')
const OUTPUT_DIR = join(projectRoot, 'public')

const icons = [
  { maskable: false, name: 'icon-192.png', size: 192 },
  { maskable: false, name: 'icon-512.png', size: 512 },
  { maskable: true, name: 'icon-maskable-192.png', size: 192 },
  { maskable: true, name: 'icon-maskable-512.png', size: 512 },
  { maskable: false, name: 'apple-touch-icon.png', size: 180 },
]

async function generateIcons() {
  console.log('🎨 PWAアイコン生成開始...\n')

  for (const { name, size, maskable } of icons) {
    const outputPath = join(OUTPUT_DIR, name)

    try {
      const image = sharp(INPUT_LOGO)

      if (maskable) {
        // maskable: 80%サイズで中央配置、背景色追加
        const resizedSize = Math.round(size * 0.8)
        const padding = Math.round((size - resizedSize) / 2)

        await image
          .resize(resizedSize, resizedSize, { fit: 'contain' })
          .extend({
            background: { alpha: 1, b: 0, g: 0, r: 0 },
            bottom: padding,
            left: padding,
            right: padding,
            top: padding,
          })
          .png()
          .toFile(outputPath)
      } else {
        // 通常アイコン: 中央配置でリサイズ
        await image
          .resize(size, size, { background: { alpha: 0, b: 0, g: 0, r: 0 }, fit: 'contain' })
          .png()
          .toFile(outputPath)
      }

      console.log(`✅ ${name} (${size}x${size}${maskable ? ' maskable' : ''})`)
    } catch (error) {
      console.error(`❌ ${name} 生成失敗:`, error.message)
      process.exit(1)
    }
  }

  console.log('\n✨ PWAアイコン生成完了!')
}

generateIcons()
