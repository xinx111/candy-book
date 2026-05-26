/**
 * 生成分享卡片 - Canvas 绘制 + 分享/下载
 */

const COLORS = {
  bg: '#FFF5F5',
  caramel: '#8B5E3C',
  strawberry: '#E8716D',
  matcha: '#7DA87B',
  text: '#3C2415',
  textSec: '#A0806E',
  textMuted: '#C4B0A0',
}

/**
 * AI 生成分享文案
 */
export async function generateAiCopy(record) {
  try {
    const tags = [record.sweetness, ...(record.texture || []), ...(record.flavor || []), record.temperature].filter(Boolean).join('、')
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `你是甜品文案高手。根据信息生成一句文艺有趣的中文分享文案（30字以内，不要问句，不要前缀）：

${record.shop_name ? `店铺：${record.shop_name}` : ''}
${record.name ? `名称：${record.name}` : ''}
标签：${tags}
评分：${record.rating}勺
${record.note ? `备注：${record.note}` : ''}

直接输出文案，不要解释。`
      })
    })
    const data = await res.json()
    return data.success ? data.text : ''
  } catch { return '' }
}

export async function generateShareCard(record, aiNote) {
  const { image_path, rating, sweetness, texture, flavor, temperature, shop_name, name, price, note, is_homemade, created_at } = record

  // 基础设计尺寸（逻辑像素）
  const BASE_W = 540
  const BASE_H = 720

  // 视网膜屏适配：乘以 devicePixelRatio，但用 scale 保持坐标一致
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const W = BASE_W * dpr
  const H = BASE_H * dpr

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // 所有坐标用 BASE_W / BASE_H 单位
  const w = () => BASE_W
  const h = () => BASE_H

  // ── 背景 ──
  ctx.fillStyle = COLORS.bg
  ctx.beginPath()
  roundRect(ctx, 0, 0, BASE_W, BASE_H, 24)
  ctx.fill()

  // ── 顶部照片 ──
  const photoArea = { x: 24, y: 24, w: BASE_W - 48, h: 300 }

  if (image_path) {
    const img = await loadImage(image_path)
    // 保持宽高比，居中裁剪（object-fit: cover 效果）
    const imgRatio = img.width / img.height
    const areaRatio = photoArea.w / photoArea.h
    let sx, sy, sw, sh
    if (imgRatio > areaRatio) {
      // 图片更宽：裁剪左右
      sh = img.height
      sw = img.height * areaRatio
      sx = (img.width - sw) / 2
      sy = 0
    } else {
      // 图片更高：裁剪上下
      sw = img.width
      sh = img.width / areaRatio
      sx = 0
      sy = (img.height - sh) / 2
    }
    // 先裁出圆角路径再画图
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, photoArea.x, photoArea.y, photoArea.w, photoArea.h, 16)
    ctx.clip()
    ctx.drawImage(img, sx, sy, sw, sh, photoArea.x, photoArea.y, photoArea.w, photoArea.h)
    ctx.restore()
  } else {
    const grad = ctx.createLinearGradient(photoArea.x, photoArea.y, photoArea.x + photoArea.w, photoArea.y + photoArea.h)
    grad.addColorStop(0, '#F5D6A8')
    grad.addColorStop(1, '#E8C0C0')
    ctx.fillStyle = grad
    ctx.beginPath()
    roundRect(ctx, photoArea.x, photoArea.y, photoArea.w, photoArea.h, 16)
    ctx.fill()
    ctx.font = '80px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🍰🧋', BASE_W / 2, photoArea.y + photoArea.h / 2 + 28)
  }

  // ── 评分 ──
  const ratingY = photoArea.y + photoArea.h + 40
  const safeSpoonsCount = (() => { const n = Math.floor(Number(rating)); return isNaN(n) || n < 0 ? 0 : Math.min(n, 10) })()
  const spoons = '🥄'.repeat(safeSpoonsCount)
  ctx.font = '34px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(spoons, BASE_W / 2, ratingY)
  ctx.font = 'bold 38px sans-serif'
  ctx.fillStyle = COLORS.caramel
  ctx.fillText(`${rating} 勺`, BASE_W / 2, ratingY + 46)

  // ── 名称 ──
  let nextY = ratingY + 58
  if (name) {
    ctx.font = 'bold 22px sans-serif'
    ctx.fillStyle = COLORS.text
    ctx.textAlign = 'center'
    ctx.fillText(name, BASE_W / 2, nextY)
    nextY += 34
  }

  // ── 标签 ──
  const tags = [sweetness, ...(texture || []), ...(flavor || []), temperature].filter(Boolean)
  if (tags.length > 0) {
    let tagX = 36
    const tagY = nextY + 4
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'left'
    for (const tag of tags) {
      const tw = ctx.measureText(tag).width + 28
      if (tagX + tw > BASE_W - 36) break
      ctx.fillStyle = '#F5D6A8'
      ctx.beginPath()
      roundRect(ctx, tagX, tagY, tw, 32, 16)
      ctx.fill()
      ctx.fillStyle = COLORS.caramel
      ctx.textAlign = 'center'
      ctx.fillText(tag, tagX + tw / 2, tagY + 22)
      ctx.textAlign = 'left'
      tagX += tw + 10
    }
    nextY = tagY + 50
  }

  // ── 分隔线 ──
  const dividerY = nextY + 4
  ctx.strokeStyle = '#F5E0E0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, dividerY)
  ctx.lineTo(BASE_W - 60, dividerY)
  ctx.stroke()
  nextY = dividerY + 18

  // ── 店铺 / 价格 ──
  if (!is_homemade && shop_name) {
    ctx.font = 'bold 17px sans-serif'
    ctx.fillStyle = COLORS.text
    ctx.textAlign = 'center'
    ctx.fillText(`📍 ${shop_name}`, BASE_W / 2, nextY)
    nextY += 26
  }
  if (!is_homemade && price) {
    ctx.font = '16px sans-serif'
    ctx.fillStyle = COLORS.caramel
    ctx.textAlign = 'center'
    ctx.fillText(`¥${price}`, BASE_W / 2, nextY)
    nextY += 26
  }
  if (is_homemade) {
    ctx.font = '17px sans-serif'
    ctx.fillStyle = COLORS.matcha
    ctx.textAlign = 'center'
    ctx.fillText('🏠 自制', BASE_W / 2, nextY)
    nextY += 26
  }

  // ── 文案（优先显示用户备注，没有则用 AI 生成的）──
  const displayNote = note || aiNote
  if (displayNote) {
    ctx.font = '15px sans-serif'
    ctx.fillStyle = COLORS.textSec
    ctx.textAlign = 'center'
    const maxW = BASE_W - 80
    const lines = wrapText(ctx, `"${displayNote}"`, maxW)
    for (const line of lines.slice(0, 2)) {
      ctx.fillText(line, BASE_W / 2, nextY)
      nextY += 24
    }
  }

  // ── 底部水印 ──
  ctx.font = '13px sans-serif'
  ctx.fillStyle = COLORS.textMuted
  ctx.textAlign = 'center'
  ctx.fillText(`🍰 糖记 · ${new Date(created_at).toLocaleDateString('zh-CN')}`, BASE_W / 2, BASE_H - 28)

  // ── 边框 ──
  ctx.strokeStyle = '#F5E0E0'
  ctx.lineWidth = 2 * dpr
  ctx.beginPath()
  roundRect(ctx, 1, 1, BASE_W - 2, BASE_H - 2, 24)
  ctx.stroke()

  return canvas
}

export async function shareCard(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], `糖记_分享.png`, { type: 'image/png' })

  if (navigator.share && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: '糖记 · 甜品饮品记录' })
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `糖记_分享_${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// ── Helpers ──

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split('')
  const lines = []
  let current = ''
  for (const char of text) {
    const test = current + char
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = char
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}
