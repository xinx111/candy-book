import { useState } from 'react'
import { getMonthlyStats, getWeeklySummary, groupByShop } from '../data/store'
import { formatPrice } from '../utils/format'

export default function StatsScreen({ records, navigateTo }) {
  const stats = getMonthlyStats(records)
  const week = getWeeklySummary(records)
  const shops = groupByShop(records).slice(0, 5)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewBlob, setPreviewBlob] = useState(null)

  const generateReportImage = async (reportText, stats, allRecords) => {
    const canvas = document.createElement('canvas')
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const W = 540 * dpr
    const H = 720 * dpr
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#FFF5F5'
    roundRect(ctx, 0, 0, 540, 720, 24)
    ctx.fill()

    // Title
    ctx.fillStyle = '#8B5E3C'
    ctx.font = 'bold 26px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🍰 糖记 · 口味报告', 270, 50)

    // Stats row
    const boxes = [
      { label: '总计', value: `${allRecords.length}块`, color: '#8B5E3C' },
      { label: '本月', value: `${stats.monthCount}块`, color: '#E8716D' },
      { label: '平均评分', value: `🥄${stats.avgRating}`, color: '#7DA87B' },
      { label: '总花费', value: `¥${formatPrice(stats.totalSpent)}`, color: '#8B5E3C' },
    ]
    boxes.forEach(({ label, value, color }, i) => {
      const x = 30 + i * 125
      ctx.fillStyle = `${color}15`
      roundRect(ctx, x, 75, 115, 60, 12)
      ctx.fill()
      ctx.fillStyle = color
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(value, x + 57, 105)
      ctx.font = '11px sans-serif'
      ctx.fillText(label, x + 57, 125)
    })

    // Divider
    ctx.strokeStyle = '#F0D0D0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, 155)
    ctx.lineTo(500, 155)
    ctx.stroke()

    // Report text
    ctx.fillStyle = '#3C2415'
    ctx.font = '15px sans-serif'
    ctx.textAlign = 'left'
    const lines = wrapText(ctx, reportText || '', 480)
    let y = 185
    for (const line of lines.slice(0, 18)) {
      ctx.fillText(line, 40, y)
      y += 24
    }

    // Flavor favorites
    y = Math.max(y + 20, 380)
    ctx.fillStyle = '#8B5E3C'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🏆 最爱的风味', 40, y)
    const topFlavors = Object.entries(allRecords.reduce((acc, r) => { (r.flavor || []).forEach(f => acc[f] = (acc[f]||0)+1); return acc }, {}))
      .sort((a,b) => b[1]-a[1]).slice(0, 4)
    ctx.font = '14px sans-serif'
    topFlavors.forEach(([name, count], i) => {
      ctx.fillStyle = '#A0806E'
      ctx.textAlign = 'right'
      ctx.fillText(name, 200, y + 26 + i * 24)
      const barW = Math.min(count / topFlavors[0][1] * 200, 200)
      ctx.fillStyle = '#F5D6A8'
      roundRect(ctx, 215, y + 14 + i * 24, barW, 16, 8)
      ctx.fill()
      ctx.fillStyle = '#8B5E3C'
      ctx.textAlign = 'left'
      ctx.fillText(`${count}次`, 225 + barW, y + 26 + i * 24)
    })

    // Footer
    ctx.fillStyle = '#C4B0A0'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🍰 糖记 · 一块蛋糕就是一份快乐', 270, 690)

    // Border
    ctx.strokeStyle = '#F0D0D0'
    ctx.lineWidth = 2
    roundRect(ctx, 1, 1, 538, 718, 24)
    ctx.stroke()

    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    setPreviewUrl(URL.createObjectURL(blob))
    setPreviewBlob(blob)
  }

  // Flavor aggregation
  const flavorCounts = {}
  for (const r of records) {
    for (const f of r.flavor || []) {
      flavorCounts[f] = (flavorCounts[f] || 0) + 1
    }
  }
  const totalFlavorTags = Object.values(flavorCounts).reduce((a, b) => a + b, 0)
  const topFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, pct: Math.round((count / totalFlavorTags) * 100) }))

  // 评分分布
  const ratingBuckets = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  for (const r of records) {
    const bucket = Math.min(Math.floor(r.rating), 5)
    ratingBuckets[String(Math.max(bucket, 1))]++
  }
  const maxRatingCount = Math.max(...Object.values(ratingBuckets), 1)

  // 月度趋势（近 6 个月）
  const now = new Date()
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = d.toISOString().slice(0, 7)
    const label = `${d.getMonth() + 1}月`
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const count = records.filter(r => r.created_at >= monthKey && r.created_at < nextMonth).length
    monthlyTrend.push({ label, count, monthKey })
  }
  const maxMonthlyCount = Math.max(...monthlyTrend.map(m => m.count), 1)

  // 分类统计（甜品 vs 饮品 vs 冰品）
  const catDessert = records.filter(r => !r.category || r.category === '甜品').length
  const catDrink = records.filter(r => r.category === '饮品').length
  const catIce = records.filter(r => r.category === '冰品').length
  const catTotal = Math.max(catDessert + catDrink + catIce, 1)

  const flavorColors = ['bg-matcha', '#6D4C41', 'bg-strawberry', 'bg-butter']

  // 模板生成口味报告（放在所有数据变量后面）
  const templateReport = (() => {
    if (records.length === 0) return ''
    const parts = []
    parts.push(`🍰 已经探索了 ${stats.totalCount} 块甜品`)
    const flavorTop = topFlavors.slice(0, 3)
    if (flavorTop.length > 0) {
      const [first] = flavorTop
      parts.push(`最钟情「${first.name}」风味（占 ${first.pct}%）`)
      if (flavorTop.length > 1) {
        parts.push(`也爱 ${flavorTop.slice(1).map(f => f.name).join('、')}`)
      }
    }
    if (shops.length > 0) {
      parts.push(`最常去 ${shops[0].name}（${shops[0].count} 次）`)
    }
    if (Number(stats.avgRating) >= 4) {
      parts.push(`平均 🥄${stats.avgRating}，品味很挑剔哦`)
    }
    const cats = [
      ['甜品', catDessert], ['饮品', catDrink], ['冰品', catIce]
    ].filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1])
    if (cats.length > 0) {
      const [topCat] = cats[0]
      parts.push(`最爱吃${topCat}`)
    }
    return parts.join(' · ')
  })()

  return (
    <div>
      <div className="nav-bar">
        <span className="text-[17px] font-bold text-text-primary">统计</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        <div className="bg-card-bg rounded p-4 text-center shadow-card">
          <div className="text-[28px] font-bold text-caramel">{stats.monthCount}</div>
          <div className="text-xs text-text-secondary mt-0.5">本月 · 块</div>
        </div>
        <div className="bg-card-bg rounded p-4 text-center shadow-card">
          <div className="text-[28px] font-bold text-caramel">{stats.totalCount}</div>
          <div className="text-xs text-text-secondary mt-0.5">总计 · 块</div>
        </div>
        <div className="bg-card-bg rounded p-4 text-center shadow-card">
          <div className="text-[28px] font-bold text-caramel">¥{formatPrice(stats.monthSpent)}</div>
          <div className="text-xs text-text-secondary mt-0.5">本月花费</div>
        </div>
        <div className="bg-card-bg rounded p-4 text-center shadow-card">
          <div className="text-[28px] font-bold text-caramel">¥{formatPrice(stats.totalSpent)}</div>
          <div className="text-xs text-text-secondary mt-0.5">总计花费</div>
        </div>
      </div>

      {/* Weekly summary */}
      <div className="px-5 pt-5">
        <div className="bg-card-bg rounded p-4 shadow-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-caramel">📅 本周总结</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">{week.dateRange}</span>
              <span
                className="text-[11px] text-strawberry font-medium cursor-pointer"
                onClick={() => navigateTo('weekly-report')}
              >完整周报 →</span>
            </div>
          </div>
          <div className="flex items-center justify-around mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-text-primary">{week.totalCount}</div>
              <div className="text-[10px] text-text-secondary">块</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-xl font-bold text-caramel">🥄{week.avgRating}</div>
              <div className="text-[10px] text-text-secondary">平均评分</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-xl font-bold text-strawberry">¥{formatPrice(week.totalSpent)}</div>
              <div className="text-[10px] text-text-secondary">本周花费</div>
            </div>
          </div>
          {/* Daily bar */}
          <div className="flex items-end gap-1.5 h-16 mb-1">
            {week.dailyCount.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-caramel to-butter rounded-t-sm transition-all"
                  style={{ height: `${Math.max(d.count * 20, d.count > 0 ? 8 : 2)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {week.dailyCount.map((d) => (
              <div key={d.label} className="flex-1 text-center">
                <div className="text-[10px] text-text-muted">{d.label}</div>
                <div className="text-[11px] font-medium text-text-primary">{d.count}</div>
              </div>
            ))}
          </div>
          {week.topFlavor && (
            <div className="mt-3 text-xs text-text-secondary text-center">
              本周最受欢迎 · <span className="text-caramel font-medium">{week.topFlavor}</span>
            </div>
          )}
        </div>
      </div>

      {/* 月度趋势 */}
      {records.length > 0 && (
        <div className="px-5 pt-5">
          <div className="bg-card-bg rounded p-4 shadow-card">
            <div className="text-sm font-bold text-caramel mb-3">📈 月度趋势</div>
            <div className="flex items-end gap-2 h-20 mb-1">
              {monthlyTrend.map((m) => (
                <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-matcha to-butter rounded-t-sm transition-all"
                    style={{ height: `${Math.max((m.count / maxMonthlyCount) * 100, m.count > 0 ? 10 : 3)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {monthlyTrend.map((m) => (
                <div key={m.monthKey} className="flex-1 text-center">
                  <div className="text-[10px] text-text-muted">{m.label}</div>
                  <div className="text-[11px] font-medium text-text-primary">{m.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shop ranking */}
      {shops.length > 0 && (
        <div className="px-5 pt-5">
          <div className="text-[15px] font-semibold text-text-primary pb-3">🏪 店铺排行榜</div>
          <div className="bg-card-bg rounded p-4 shadow-card">
            {shops.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <span className={`w-6 text-center text-sm font-bold ${i === 0 ? 'text-strawberry' : i === 1 ? 'text-caramel' : i === 2 ? 'text-text-muted' : 'text-text-secondary'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                className="text-sm font-medium text-text-primary truncate cursor-pointer hover:text-caramel"
                onClick={() => navigateTo('shop-detail', { shop: s.name })}
              >{s.name}</div>
                  <div className="text-[11px] text-text-muted">
                    去过 {s.count} 次 · 平均 🥄{s.avgRating}
                  </div>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.max((s.count / shops[0].count) * 80, 20)}px`,
                    background: i === 0 ? '#E8716D' : i === 1 ? '#8B5E3C' : i === 2 ? '#FDE2E4' : '#F5E0E0',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 评分分布 */}
      <div className="text-[15px] font-semibold text-text-primary px-5 pt-5 pb-3">
        ── 评分分布 ──
      </div>
      <div className="px-5">
        {[
          { stars: '5️⃣', bucket: '5', color: 'bg-strawberry' },
          { stars: '4️⃣', bucket: '4', color: 'bg-caramel' },
          { stars: '3️⃣', bucket: '3', color: 'bg-butter' },
          { stars: '2️⃣', bucket: '2', color: 'bg-text-muted' },
          { stars: '1️⃣', bucket: '1', color: 'bg-text-muted/50' },
        ].map((row) => (
          <div key={row.bucket} className="flex items-center mb-2 text-[13px] text-text-primary">
            <span className="w-8">{row.stars}</span>
            <div className="flex-1 h-3 bg-[#F0D8D8] rounded mx-2 overflow-hidden">
              <div
                className={`h-full rounded ${row.color}`}
                style={{ width: `${(ratingBuckets[row.bucket] / maxRatingCount) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-[12px] text-text-secondary">{ratingBuckets[row.bucket]}</span>
          </div>
        ))}
      </div>

      {/* 分类统计 */}
      <div className="text-[15px] font-semibold text-text-primary px-5 pt-4 pb-3">
        ── 分类统计 ──
      </div>
      <div className="px-5 pb-2">
        <div className="flex items-center mb-2 text-[13px] text-text-primary">
          <span className="w-8">🍰</span>甜品
          <div className="flex-1 h-3 bg-[#F0D8D8] rounded mx-2 overflow-hidden">
            <div
              className="h-full rounded bg-matcha"
              style={{ width: `${(catDessert / catTotal) * 100}%` }}
            />
          </div>
          <span className="text-[12px] text-text-secondary">{catDessert}</span>
        </div>
        <div className="flex items-center mb-2 text-[13px] text-text-primary">
          <span className="w-8">🧋</span>饮品
          <div className="flex-1 h-3 bg-[#F0D8D8] rounded mx-2 overflow-hidden">
            <div
              className="h-full rounded bg-strawberry"
              style={{ width: `${(catDrink / catTotal) * 100}%` }}
            />
          </div>
          <span className="text-[12px] text-text-secondary">{catDrink}</span>
        </div>
        <div className="flex items-center mb-2 text-[13px] text-text-primary">
          <span className="w-8">🍦</span>冰品
          <div className="flex-1 h-3 bg-[#F0D8D8] rounded mx-2 overflow-hidden">
            <div
              className="h-full rounded bg-[#4A90D9]"
              style={{ width: `${(catIce / catTotal) * 100}%` }}
            />
          </div>
          <span className="text-[12px] text-text-secondary">{catIce}</span>
        </div>
      </div>

      {/* Flavor preference */}
      <div className="text-[15px] font-semibold text-text-primary px-5 pt-4 pb-3">
        ── 口味偏好 ──
      </div>
      <div className="px-5">
        {topFlavors.length > 0 ? (
          topFlavors.map((f, i) => (
            <div key={f.name} className="flex items-center mb-2.5 text-[13px] text-text-primary">
              <span className="w-10 text-[13px]">{f.name}</span>
              <div className="flex-1 h-2 bg-[#F0D8D8] rounded mx-2.5 overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.min(f.pct, 100)}%`, background: flavorColors[i % 4] }}
                />
              </div>
              <span className="text-[13px] text-text-secondary">{f.pct}%</span>
            </div>
          ))
        ) : (
          <div className="text-sm text-text-muted pb-4">暂无数据，多记录一些吧</div>
        )}
      </div>

      {/* 口味报告 */}
      {records.length > 0 && (
        <div className="px-5 pt-5">
          <div className="bg-card-bg rounded p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-caramel">📝 口味报告</span>
              <button className="text-xs px-3 py-1 rounded-pill font-medium bg-caramel text-white" onClick={() => generateReportImage(templateReport, stats, records)}>
                🖼️ 生成图片
              </button>
            </div>
            <div className="text-xs text-text-primary leading-relaxed py-1">{templateReport}</div>
          </div>
        </div>
      )}

      {/* Wishlist link */}
      <div
        className="px-5 py-2 text-sm text-strawberry cursor-pointer"
        onClick={() => navigateTo('wishlist')}
      >
        📋 想吃清单 →
      </div>

      {/* 报告图片预览 */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewBlob(null) }}>
          <div className="bg-white rounded-xl overflow-hidden max-h-[90vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-y-auto p-4">
              <img src={previewUrl} alt="报告预览" className="w-[300px] h-auto rounded-lg shadow" />
            </div>
            <div className="flex gap-3 px-4 pb-4">
              <button className="flex-1 py-2.5 bg-caramel text-white rounded-pill text-sm font-semibold" onClick={() => {
                const file = new File([previewBlob], `糖记_口味报告.png`, { type: 'image/png' })
                if (navigator.share) navigator.share({ files: [file], title: '糖记 · 口味报告' })
                  .catch(() => { const a = document.createElement('a'); a.href = previewUrl; a.download = `糖记_口味报告.png`; a.click() })
              }}>
                📤 分享
              </button>
              <button className="flex-1 py-2.5 bg-white text-text-secondary border border-border rounded-pill text-sm" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewBlob(null) }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Canvas 工具函数 ──
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

function wrapText(ctx, text, maxWidth) {
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
