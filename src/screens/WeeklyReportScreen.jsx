import { useState, useEffect, useCallback } from 'react'
import { getWeeklySummary } from '../data/store'
import LazyImage from '../components/LazyImage'

const COLORS = {
  caramel: '#8B5E3C',
  strawberry: '#E8716D',
  matcha: '#7DA87B',
  butter: '#F5D6A8',
}

export default function WeeklyReportScreen({ records, navigateTo, goBack }) {
  const [aiReport, setAiReport] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const week = getWeeklySummary(records)

  // 计算额外统计
  const weekRecords = records.filter((r) => {
    const now = new Date()
    const dayOfWeek = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const d = new Date(r.created_at)
    return d >= monday && d <= sunday
  })

  // 风味排行
  const flavorCounts = {}
  for (const r of weekRecords) {
    for (const f of r.flavor || []) {
      flavorCounts[f] = (flavorCounts[f] || 0) + 1
    }
  }
  const topFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // 店铺排行
  const shopCounts = {}
  for (const r of weekRecords) {
    if (r.shop_name) {
      shopCounts[r.shop_name] = (shopCounts[r.shop_name] || 0) + 1
    }
  }
  const topShops = Object.entries(shopCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // 最高评分
  const bestRecord = weekRecords.length > 0
    ? weekRecords.reduce((a, b) => (a.rating > b.rating ? a : b))
    : null

  // 评分分布
  const buckets = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  for (const r of weekRecords) {
    const b = Math.min(Math.floor(r.rating), 5)
    buckets[String(Math.max(b, 1))]++
  }
  const maxBucket = Math.max(...Object.values(buckets), 1)

  const generateAiReport = useCallback(async () => {
    if (weekRecords.length === 0) return
    setAiLoading(true)
    setAiError('')
    setAiReport(null)
    try {
      const flavorSummary = topFlavors.map(([n, c]) => `${n}(${c}次)`).join('、')
      const shopSummary = topShops.map(([n, c]) => `${n}(${c}次)`).join('、')
      const catCounts = {}
      for (const r of weekRecords) {
        const c = r.category || '甜品'
        catCounts[c] = (catCounts[c] || 0) + 1
      }
      const catSummary = Object.entries(catCounts).map(([k, v]) => `${k}${v}块`).join('、')
      const best = bestRecord
        ? `${bestRecord.name || (bestRecord.flavor || []).join('·')}（🥄${bestRecord.rating}分${bestRecord.shop_name ? '，在' + bestRecord.shop_name : ''}）`
        : '暂无'

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `你是一个甜品诗人的助手。根据本周的甜品数据，生成一段温暖有趣的周报总结（150字以内，像朋友聊天，不要太啰嗦）：

📊 本周数据（${week.dateRange}）
总记录：${week.totalCount}块
平均评分：🥄${week.avgRating}
本周花费：¥${week.totalSpent}
风味排行：${flavorSummary || '暂无'}
常去店铺：${shopSummary || '暂无'}
分类分布：${catSummary}
本周最佳：${best}

要求：
1. 第一句话是亮点总结（比如"这周你吃了X块甜品..."）
2. 中间写饮食习惯分析（偏好什么口味、有什么有趣的发现）
3. 最后一句话是温暖的期待

直接输出内容，不要任何前缀。`
        }),
      })
      const data = await res.json()
      if (data.success) setAiReport(data.text)
      else setAiError('AI 报告生成失败')
    } catch (e) {
      setAiError('网络错误，请重试')
    }
    setAiLoading(false)
  }, [weekRecords, week, topFlavors, topShops, bestRecord])

  useEffect(() => {
    if (weekRecords.length > 0 && !aiReport && !aiLoading) {
      generateAiReport()
    }
  }, [])

  const maxDaily = Math.max(...week.dailyCount.map(d => d.count), 1)

  return (
    <div>
      {/* Nav */}
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={goBack}>
          ← 返回
        </span>
        <span className="text-[17px] font-bold text-text-primary">📊 本周周报</span>
        <span className="text-xs text-text-muted">{week.dateRange}</span>
      </div>

      {/* Empty */}
      {weekRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-20 px-10 text-center">
          <div className="text-6xl mb-4">📭</div>
          <div className="text-lg font-semibold text-text-primary mb-1">这周还没有记录</div>
          <div className="text-sm text-text-secondary">去吃块甜品再回来吧 🍰</div>
        </div>
      )}

      {weekRecords.length > 0 && (
        <div className="px-5 pt-4 pb-8">
          {/* AI 总结（顶部醒目） */}
          <div className="bg-gradient-to-br from-caramel to-[#A07050] rounded-xl p-5 shadow-lg mb-4">
            <div className="text-white/70 text-xs font-medium mb-2">🤖 AI 周报</div>
            {aiLoading && (
              <div className="text-white/90 text-sm animate-pulse leading-relaxed">AI 正在分析你的甜蜜一周…</div>
            )}
            {aiReport && !aiLoading && (
              <div className="text-white text-sm leading-relaxed">{aiReport}</div>
            )}
            {aiError && !aiLoading && (
              <div>
                <div className="text-white/80 text-sm leading-relaxed">{aiError}</div>
                <button className="text-white/60 text-xs mt-2 underline" onClick={generateAiReport}>
                  重新生成
                </button>
              </div>
            )}
          </div>

          {/* 核心数据卡片 */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="bg-card-bg rounded-xl p-3.5 text-center shadow-card">
              <div className="text-[26px] font-bold" style={{ color: COLORS.caramel }}>{week.totalCount}</div>
              <div className="text-[11px] text-text-secondary">本周 · 块</div>
            </div>
            <div className="bg-card-bg rounded-xl p-3.5 text-center shadow-card">
              <div className="text-[26px] font-bold" style={{ color: COLORS.strawberry }}>🥄{week.avgRating}</div>
              <div className="text-[11px] text-text-secondary">平均评分</div>
            </div>
            <div className="bg-card-bg rounded-xl p-3.5 text-center shadow-card">
              <div className="text-[26px] font-bold" style={{ color: COLORS.matcha }}>¥{week.totalSpent}</div>
              <div className="text-[11px] text-text-secondary">本周花费</div>
            </div>
          </div>

          {/* 本周最佳 */}
          {bestRecord && (
            <div className="bg-card-bg rounded-xl p-4 shadow-card mb-4">
              <div className="text-[13px] font-semibold text-text-primary mb-2">🏆 本周最佳</div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-butter to-[#E8C0C0] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                  {bestRecord.has_image ? (
                    <LazyImage id={bestRecord.id} type="thumb" className="w-full h-full" />
                  ) : (
                    '🍰'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {bestRecord.name || (bestRecord.flavor || []).join('·') || '未知甜品'}
                  </div>
                  <div className="text-[12px] text-text-secondary">
                    🥄{bestRecord.rating} 分
                    {bestRecord.shop_name && ` · 📍${bestRecord.shop_name}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 每日分布 */}
          <div className="bg-card-bg rounded-xl p-4 shadow-card mb-4">
            <div className="text-[13px] font-semibold text-text-primary mb-3">📅 每日分布</div>
            <div className="flex items-end gap-1.5 h-20 mb-2">
              {week.dailyCount.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 15 : 4)}%`,
                      background: d.count > 0
                        ? `linear-gradient(to top, ${COLORS.caramel}, ${COLORS.butter})`
                        : '#F0D8D8',
                    }}
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
          </div>

          {/* 风味排行 */}
          {topFlavors.length > 0 && (
            <div className="bg-card-bg rounded-xl p-4 shadow-card mb-4">
              <div className="text-[13px] font-semibold text-text-primary mb-3">🍭 风味排行</div>
              {topFlavors.map(([name, count], i) => {
                const pct = Math.max((count / topFlavors[0][1]) * 100, 10)
                const colors = [COLORS.strawberry, COLORS.caramel, COLORS.matcha, '#FFD93D', '#C4B0A0']
                return (
                  <div key={name} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
                    <span className="w-4 text-center text-xs font-bold" style={{ color: colors[i] }}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-text-primary w-12">{name}</span>
                    <div className="flex-1 h-3 bg-[#F0D8D8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: colors[i] }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary w-6 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 店铺排行 */}
          {topShops.length > 0 && (
            <div className="bg-card-bg rounded-xl p-4 shadow-card mb-4">
              <div className="text-[13px] font-semibold text-text-primary mb-3">📍 常去店铺</div>
              {topShops.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-0">
                  <span className="text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span
                    className="text-sm text-text-primary flex-1 cursor-pointer hover:text-caramel"
                    onClick={() => navigateTo('shop-detail', { shop: name })}
                  >{name}</span>
                  <span className="text-xs text-text-secondary">{count}次</span>
                </div>
              ))}
            </div>
          )}

          {/* 分类 + 评分分布 */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-card-bg rounded-xl p-4 shadow-card">
              <div className="text-[13px] font-semibold text-text-primary mb-3">📊 分类</div>
              {(() => {
                const catCounts = {}
                for (const r of weekRecords) {
                  const c = r.category || '甜品'
                  catCounts[c] = (catCounts[c] || 0) + 1
                }
                const total = Math.max(Object.values(catCounts).reduce((a, b) => a + b, 0), 1)
                return (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🍰</span>
                      <div className="flex-1 h-2 bg-[#F0D8D8] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-matcha" style={{ width: `${((catCounts['甜品'] || 0) / total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary">{catCounts['甜品'] || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🧋</span>
                      <div className="flex-1 h-2 bg-[#F0D8D8] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-strawberry" style={{ width: `${((catCounts['饮品'] || 0) / total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary">{catCounts['饮品'] || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">🍦</span>
                      <div className="flex-1 h-2 bg-[#F0D8D8] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#4A90D9]" style={{ width: `${((catCounts['冰品'] || 0) / total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary">{catCounts['冰品'] || 0}</span>
                    </div>
                  </>
                )
              })()}
            </div>
            <div className="bg-card-bg rounded-xl p-4 shadow-card">
              <div className="text-[13px] font-semibold text-text-primary mb-3">⭐ 评分</div>
              {[
                { label: '5', emoji: '5️⃣', bucket: '5' },
                { label: '4', emoji: '4️⃣', bucket: '4' },
                { label: '3', emoji: '3️⃣', bucket: '3' },
              ].map((row) => (
                <div key={row.bucket} className="flex items-center gap-1.5 mb-1.5 last:mb-0">
                  <span className="text-xs">{row.emoji}</span>
                  <div className="flex-1 h-2 bg-[#F0D8D8] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(buckets[row.bucket] / maxBucket) * 100}%`,
                        background: row.bucket === '5' ? COLORS.strawberry : row.bucket === '4' ? COLORS.caramel : COLORS.butter,
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary">{buckets[row.bucket]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 重新生成按钮 */}
          <div className="text-center pt-2">
            <button
              className={`text-xs px-4 py-2 rounded-pill font-medium ${
                aiLoading ? 'bg-text-muted/20 text-text-muted' : 'bg-caramel/10 text-caramel'
              }`}
              onClick={generateAiReport}
              disabled={aiLoading}
            >
              {aiLoading ? '🤖 生成中…' : '🔄 重新生成 AI 分析'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
