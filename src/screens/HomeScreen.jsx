import { useState } from 'react'
import { groupByDate, deleteRecord, getRecordImage } from '../data/store'
import DessertCard from '../components/DessertCard'
import LuckyDice from '../components/LuckyDice'
import { generateShareCard, shareCard, generateAiCopy } from '../utils/share'

const EASTER_EGG_PUNS = [
  '🍰 甜品哪有上限？再吃一块！',
  '🍰 你知道糖记的糖是「甜蜜」的糖吗？',
  '🍰 抹茶和芝士是天生一对 🤝',
  '🍰 据说点够 20 次会有惊喜…',
  '🍰 你已经是甜品大师了！',
]

const EMPTY_MESSAGES = [
  { emoji: '🍨', title: '还没有记录', desc: '你的第一条记录正在等你' },
  { emoji: '🍩', title: '这里空空的', desc: '是时候来块甜品了' },
  { emoji: '🧋', title: '第一口最甜', desc: '记录下你的第一杯奶茶吧' },
  { emoji: '🍮', title: '甜品暴击待开启', desc: '一块蛋糕就能点亮今天 ✨' },
  { emoji: '🍰', title: '糖分不足', desc: '快去找块甜品补充能量' },
]

export default function HomeScreen({ records, navigateTo, loadRecords }) {
  const [search, setSearch] = useState('')
  const [showLuckyDice, setShowLuckyDice] = useState(false)
  const [sharingId, setSharingId] = useState(null)
  const [displayCount, setDisplayCount] = useState(5)
  const [titleClicks, setTitleClicks] = useState(0)
  const [showPun, setShowPun] = useState(null)
  const PAGE_SIZE = 5

  const handleDelete = async (id) => {
    await deleteRecord(id)
    await loadRecords()
  }

  const handleShare = async (record) => {
    setSharingId(record.id)
    try {
      const img = await getRecordImage(record.id)
      const shareRecord = { ...record, image_path: img }
      const aiNote = await generateAiCopy(shareRecord)
      const canvas = await generateShareCard(shareRecord, aiNote)
      await shareCard(canvas)
    } catch (e) {
      alert('生成分享卡片失败：' + e.message)
    }
    setSharingId(null)
  }

  if (!records || records.length === 0) {
    return (
      <div>
        <div className="nav-bar">
          <span
            className="text-[17px] font-bold text-text-primary cursor-pointer"
            onClick={() => navigateTo('calendar')}
          >🍰 糖记</span>
          <span className="text-lg text-text-secondary cursor-pointer" onClick={() => navigateTo('settings')}>
            ⚙️
          </span>
        </div>
        {(() => {
          const m = EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)]
          return (
          <div className="flex flex-col items-center justify-center px-10 pt-20 text-center">
            <div className="text-6xl mb-5">{m.emoji}</div>
            <div className="text-lg font-semibold text-text-primary mb-1.5">{m.title}</div>
            <div className="text-sm text-text-secondary mb-6 leading-relaxed">{m.desc}</div>
            <button
              className="px-10 py-3.5 bg-gradient-to-br from-butter to-[#E8C0C0] rounded-pill text-[15px] font-semibold text-caramel"
              onClick={() => navigateTo('record')}
            >
              ✨ 记录今天第一块
            </button>
            <div
              className="mt-4 text-sm text-text-muted cursor-pointer"
              onClick={() => navigateTo('record')}
            >
              从相册导入以前的照片
            </div>
          </div>
          )
        })()}
      </div>
    )
  }

  // 搜索过滤（关键词匹配）
  const filtered = records.filter((r) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      (r.shop_name || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.flavor || []).some((f) => f.toLowerCase().includes(q)) ||
      (r.texture || []).some((t) => t.toLowerCase().includes(q)) ||
      (r.note || '').toLowerCase().includes(q)
    )
  })

  // 分页：只展示前 displayCount 条
  const visibleRecords = filtered.slice(0, displayCount)
  const dateGroups = groupByDate(visibleRecords)
  const hasMore = filtered.length > displayCount
  const hasFilter = search.trim().length > 0

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const m = d.getMonth() + 1
    const day = d.getDate()
    const wd = weekDays[d.getDay()]
    return `${m}月${day}日 ${wd}`
  }

  return (
    <div>
      {/* Nav Bar */}
      <div className="nav-bar">
        <span
          className="text-[17px] font-bold text-text-primary cursor-pointer select-none"
          onClick={() => {
            const c = titleClicks + 1
            setTitleClicks(c)
            if (c >= 10) {
              setShowPun(EASTER_EGG_PUNS[Math.floor(Math.random() * EASTER_EGG_PUNS.length)])
              setTitleClicks(0)
              setTimeout(() => setShowPun(null), 3000)
            }
          }}
        >🍰 糖记</span>
        <span className="flex gap-4 text-lg text-text-secondary cursor-pointer">
          <span onClick={() => navigateTo('settings')}>⚙️</span>
        </span>
      </div>

      {/* 隐藏彩蛋：甜品小知识 */}
      {showPun && (
        <div className="mx-5 mb-1 px-4 py-2 bg-caramel/10 border border-caramel/20 rounded-lg text-xs text-caramel text-center animate-bounce-up">
          {showPun}
        </div>
      )}

      {/* CTA — 时段问候 */}
      {(() => {
        const h = new Date().getHours()
        let msg, emoji
        if (h < 6) { msg = '夜深了，用甜品治愈自己'; emoji = '🌙' }
        else if (h < 10) { msg = '早安，来块蛋糕开启美好一天'; emoji = '☀️' }
        else if (h < 14) { msg = '今天想吃点什么'; emoji = '🍰' }
        else if (h < 17) { msg = '下午茶时间到！'; emoji = '🫖' }
        else if (h < 20) { msg = '晚饭后来块甜品吧'; emoji = '🌆' }
        else { msg = '用甜蜜结束这一天'; emoji = '🌙' }
        return (
          <div className="btn-cta" onClick={() => navigateTo('record')}>
            <span className="text-[15px] font-semibold text-caramel">{emoji} {msg}</span>
            <span className="w-8 h-8 bg-strawberry rounded-full flex items-center justify-center text-white text-xl leading-none">
              ＋
            </span>
          </div>
        )
      })()}

      {/* Search */}
      <div className="px-5 pt-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">🔍</span>
          <input
            className="form-input pl-9 pr-8 text-sm"
            placeholder="搜索店铺、口味、口感..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted cursor-pointer"
              onClick={() => setSearch('')}
            >
              ✕
            </span>
          )}
        </div>
      </div>

      {/* Empty search */}
      {hasFilter && dateGroups.length === 0 && (
        <div className="text-center text-text-muted py-10 text-sm">
          没有找到匹配「{search}」的记录
        </div>
      )}

      {/* Timeline */}
      {dateGroups.map(([date, items]) => (
        <div key={date}>
          <div className="pt-4 pb-2 px-5 flex justify-between items-center">
            <span className="text-sm font-semibold text-text-primary">
              {formatDateHeader(date)}
            </span>
            <span className="text-xs text-text-secondary">
              {items.length}块 🥄
            </span>
          </div>

          <div className="px-5">
            {items.map((r) => (
              <DessertCard
                key={r.id}
                record={r}
                onClick={() => navigateTo('detail', { id: r.id })}
                onDelete={handleDelete}
                onShopClick={(shop) => navigateTo('shop-detail', { shop })}
                onShare={handleShare}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 加载更多 */}
      {hasMore && (
        <div className="text-center pb-4">
          <button
            className="text-xs px-6 py-2.5 bg-card-bg rounded-pill text-text-secondary font-medium shadow-card hover:bg-caramel hover:text-white transition-colors"
            onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
          >
            显示更多（{filtered.length - displayCount}条）
          </button>
        </div>
      )}

      {!hasMore && filtered.length > 0 && (
        <div className="text-center text-[11px] text-text-muted pb-4">
          — 已显示全部 {filtered.length} 条记录 —
        </div>
      )}

      {/* Calendar link */}
      <div
        className="text-center text-xs text-text-muted py-6 cursor-pointer"
        onClick={() => navigateTo('calendar')}
      >📅 查看日历月视图</div>

      {/* Lucky Dice FAB */}
      {records.length > 0 && (
        <div className="sticky bottom-4 z-10 flex justify-end px-5 pointer-events-none">
          <div
            className="w-11 h-11 bg-gradient-to-br from-caramel to-[#A07050] rounded-full flex items-center justify-center text-lg shadow-lg cursor-pointer active:scale-90 transition-transform pointer-events-auto hover:shadow-xl"
            onClick={() => setShowLuckyDice(true)}
          >
            🎲
          </div>
        </div>
      )}

      {showLuckyDice && (
        <LuckyDice
          records={records}
          onClose={() => setShowLuckyDice(false)}
          navigateTo={navigateTo}
        />
      )}
    </div>
  )
}
