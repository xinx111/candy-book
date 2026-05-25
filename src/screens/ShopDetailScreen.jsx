import { useState, useMemo } from 'react'
import { groupByDate, deleteRecord } from '../data/store'
import DessertCard from '../components/DessertCard'

export default function ShopDetailScreen({ records, params, navigateTo, goBack, loadRecords }) {
  const shopName = params?.shop || ''
  const [sortBy, setSortBy] = useState('date') // date | rating

  const shopRecords = useMemo(
    () => records.filter((r) => r.shop_name === shopName),
    [records, shopName]
  )

  // 计算统计
  const stats = useMemo(() => {
    const count = shopRecords.length
    const avgRating = count > 0
      ? (shopRecords.reduce((s, r) => s + r.rating, 0) / count).toFixed(1)
      : '0'
    const totalSpent = shopRecords
      .filter((r) => r.price != null && !r.is_homemade)
      .reduce((s, r) => s + Number(r.price), 0)
    const bestRecord = count > 0
      ? shopRecords.reduce((a, b) => (a.rating > b.rating ? a : b))
      : null
    const categories = {}
    for (const r of shopRecords) {
      const c = r.category || '甜品'
      categories[c] = (categories[c] || 0) + 1
    }
    const flavorCounts = {}
    for (const r of shopRecords) {
      for (const f of r.flavor || []) {
        flavorCounts[f] = (flavorCounts[f] || 0) + 1
      }
    }
    const topFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n, c]) => `${n}(${c}次)`)
      .join('、')
    return { count, avgRating, totalSpent, bestRecord, topFlavors, categories }
  }, [shopRecords])

  // 排序 & 分组
  const sortedRecords = useMemo(() => {
    const list = [...shopRecords]
    if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating)
    }
    return list
  }, [shopRecords, sortBy])

  const dateGroups = sortBy === 'date' ? groupByDate(sortedRecords) : []
  const ratingGroups = sortBy === 'rating' ? sortedRecords : []

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const m = d.getMonth() + 1
    const day = d.getDate()
    const wd = weekDays[d.getDay()]
    return `${m}月${day}日 ${wd}`
  }

  const handleDelete = async (id) => {
    await deleteRecord(id)
    await loadRecords()
  }

  return (
    <div>
      {/* Nav */}
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={goBack}>
          ← 返回
        </span>
        <span className="text-[17px] font-bold text-text-primary truncate max-w-[180px]">
          📍 {shopName}
        </span>
        <div className="flex gap-1">
          <button
            className={`text-xs px-2.5 py-1 rounded-pill font-medium transition-colors ${
              sortBy === 'date' ? 'bg-caramel text-white' : 'bg-[#F0D8D8] text-text-secondary'
            }`}
            onClick={() => setSortBy('date')}
          >
            按日期
          </button>
          <button
            className={`text-xs px-2.5 py-1 rounded-pill font-medium transition-colors ${
              sortBy === 'rating' ? 'bg-caramel text-white' : 'bg-[#F0D8D8] text-text-secondary'
            }`}
            onClick={() => setSortBy('rating')}
          >
            按评分
          </button>
        </div>
      </div>

      {/* Shop Hero */}
      <div className="bg-gradient-to-br from-caramel to-[#A07050] mx-5 mt-4 rounded-xl p-5 shadow-lg">
        <div className="text-white text-lg font-bold mb-1">📍 {shopName}</div>
        <div className="flex items-center justify-around mt-3">
          <div className="text-center">
            <div className="text-white text-2xl font-bold">{stats.count}</div>
            <div className="text-white/70 text-[11px]">去过 · 次</div>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div className="text-center">
            <div className="text-white text-2xl font-bold">🥄{stats.avgRating}</div>
            <div className="text-white/70 text-[11px]">平均评分</div>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div className="text-center">
            <div className="text-white text-2xl font-bold">¥{stats.totalSpent}</div>
            <div className="text-white/70 text-[11px]">总计花费</div>
          </div>
        </div>
        {/* Best record */}
        {stats.bestRecord && (
          <div className="mt-3 bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-white text-lg">🏆</span>
            <div className="text-white/90 text-xs">
              最佳：
              <span className="font-semibold">{stats.bestRecord.name || (stats.bestRecord.flavor || []).join('·') || '未知'}</span>
              <span className="ml-1">🥄{stats.bestRecord.rating}分</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mx-5 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-secondary bg-card-bg px-2.5 py-1 rounded-pill shadow-card">
            🍭 {stats.topFlavors || '暂无风味数据'}
          </span>
        </div>
        <span className="text-[11px] text-text-muted">
          {stats.count}条记录
        </span>
      </div>

      {/* Record list */}
      <div className="px-5 pt-4 pb-8">
        {sortBy === 'date' && dateGroups.map(([date, items]) => (
          <div key={date}>
            <div className="pt-3 pb-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-text-primary">
                {formatDateHeader(date)}
              </span>
              <span className="text-xs text-text-secondary">
                {items.length}块 🥄
              </span>
            </div>
            {items.map((r) => (
              <DessertCard
                key={r.id}
                record={r}
                onClick={() => navigateTo('detail', { id: r.id })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))}

        {sortBy === 'rating' && ratingGroups.map((r) => (
          <DessertCard
            key={r.id}
            record={r}
            onClick={() => navigateTo('detail', { id: r.id })}
            onDelete={handleDelete}
          />
        ))}

        {shopRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-5xl mb-4">🏪</div>
            <div className="text-base font-semibold text-text-primary mb-1">还没有去过这家店</div>
            <div className="text-sm text-text-secondary">记录一条甜品试试吧 🍰</div>
          </div>
        )}
      </div>
    </div>
  )
}
