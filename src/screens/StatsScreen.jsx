import { useState } from 'react'
import { getMonthlyStats, getWeeklySummary, groupByShop } from '../data/store'

export default function StatsScreen({ records, navigateTo }) {
  const stats = getMonthlyStats(records)
  const week = getWeeklySummary(records)
  const shops = groupByShop(records).slice(0, 5)
  const [aiReport, setAiReport] = useState(null)
  const [aiReportLoading, setAiReportLoading] = useState(false)

  const generateAiReport = async () => {
    if (records.length === 0) return
    setAiReportLoading(true)
    setAiReport(null)
    try {
      // 计算摘要数据
      const total = records.length
      const avgRating = (records.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
      const topFlavors_ = Object.entries(records.reduce((acc, r) => { (r.flavor || []).forEach(f => acc[f] = (acc[f]||0)+1); return acc }, {}))
        .sort((a,b) => b[1]-a[1]).slice(0, 3).map(([n,c]) => `${n}${c}次`).join('、')
      const topShops_ = Object.entries(records.reduce((acc, r) => { if (r.shop_name) acc[r.shop_name] = (acc[r.shop_name]||0)+1; return acc }, {}))
        .sort((a,b) => b[1]-a[1]).slice(0, 3).map(([n,c]) => `${n}(${c}次)`).join('、')
      const cats = records.reduce((acc, r) => { const c = r.category||'甜品'; acc[c] = (acc[c]||0)+1; return acc }, {})
      const catSummary = Object.entries(cats).map(([k,v]) => `${k}${v}块`).join('、')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `你是一个甜品爱好者的私人饮食分析师。根据以下数据生成一段有趣、温暖的个性化口味报告（100字以内，不要啰嗦，语气像朋友聊天）：

总记录：${total}块
平均评分：🥄${avgRating}
热门风味：${topFlavors_ || '暂无'}
常去店铺：${topShops_ || '暂无'}
分类：${catSummary}
总花费：¥${stats.totalSpent}

写一段中文报告，分析饮食习惯、口味偏好，给出有趣的小发现。直接输出内容，不要前缀。`
        })
      })
      const data = await res.json()
      if (data.success) setAiReport(data.text)
      else setAiReport('生成失败，请重试')
    } catch (e) {
      setAiReport('网络错误，请重试')
    }
    setAiReportLoading(false)
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
          <div className="text-[28px] font-bold text-caramel">¥{stats.monthSpent}</div>
          <div className="text-xs text-text-secondary mt-0.5">本月花费</div>
        </div>
        <div className="bg-card-bg rounded p-4 text-center shadow-card">
          <div className="text-[28px] font-bold text-caramel">¥{stats.totalSpent}</div>
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
              <div className="text-xl font-bold text-strawberry">¥{week.totalSpent}</div>
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

      {/* AI 口味报告 */}
      {records.length > 0 && (
        <div className="px-5 pt-5">
          <div className="bg-card-bg rounded p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-caramel">🤖 AI 口味报告</span>
              <button
                className={`text-xs px-3 py-1 rounded-pill font-medium ${aiReportLoading ? 'bg-text-muted/20 text-text-muted' : 'bg-caramel text-white'}`}
                onClick={generateAiReport}
                disabled={aiReportLoading}
              >
                {aiReportLoading ? '生成中…' : aiReport ? '重新生成' : '生成报告'}
              </button>
            </div>
            {aiReportLoading && (
              <div className="text-xs text-text-secondary animate-pulse py-2">🤖 AI 正在分析你的口味习惯…</div>
            )}
            {aiReport && !aiReportLoading && (
              <div className="text-xs text-text-primary leading-relaxed py-1">{aiReport}</div>
            )}
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
    </div>
  )
}
