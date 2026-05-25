#!/usr/bin/env node
/**
 * 糖记 PWA 图标生成器
 * 使用 SVG + ImageMagick 生成可爱风格 PNG 图标
 * 依赖: convert (ImageMagick)
 * 使用方法: node scripts/generate-icons.mjs
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const svgPath = resolve(publicDir, 'icon.svg')

function generateIcon(size) {
  const outPath = resolve(publicDir, `icon-${size}.png`)
  console.log(`生成 ${size}×${size} 图标...`)
  const cmd = `convert -background none -depth 8 -size ${size}x${size} "${svgPath}" "${outPath}"`
  execSync(cmd, { stdio: 'inherit' })
  console.log(`  ✓ icon-${size}.png`)
}

try {
  execSync('which convert', { stdio: 'pipe' })
  if (!existsSync(svgPath)) {
    console.error(`找不到 SVG 文件: ${svgPath}`)
    process.exit(1)
  }
  generateIcon(192)
  generateIcon(512)
  console.log('\n图标生成完成！')
} catch (err) {
  console.error('生成失败:', err.message)
  console.error('请确保已安装 ImageMagick (convert 命令)')
  process.exit(1)
}
