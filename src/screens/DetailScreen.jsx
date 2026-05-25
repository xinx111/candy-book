import { useState, useEffect } from 'react'
import { getRecord, deleteRecord } from '../data/store'
import { RATING_TEXTS } from '../data/constants'
import { generateShareCard, shareCard, generateAiCopy } from '../utils/share'

function renderSpoons(rating) {
  const n = Math.floor(Number(rating))
  if (isNaN(n) || n < 0) return ''
  return '🥄'.repeat(Math.min(n, 10))
}

export default function DetailScreen({ params, navigateTo, goBack, loadRecords }) {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!params?.id) {
      setLoading(false)
      return
    }
    getRecord(params.id)
      .then((r) => {
        setRecord(r)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">加载中…</div>
    )
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        记录不存在
        <button className="ml-4 text-caramel" onClick={goBack}>返回</button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await deleteRecord(record.id)
      await loadRecords()
      goBack()
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const aiNote = await generateAiCopy(record)
      const canvas = await generateShareCard(record, aiNote)
      await shareCard(canvas)
    } catch (e) {
      alert('生成分享卡片失败: ' + e.message)
    }
    setSharing(false)
  }

  const { image_path, rating, sweetness, texture, flavor, temperature, shop_name, name, location, price, note, is_homemade, created_at, category } = record
  const tags = [sweetness, ...(texture || []), ...(flavor || []), temperature]

  return (
    <div>
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={goBack}>
          ← 手账
        </span>
        <span
          className="text-lg cursor-pointer"
          onClick={() => navigateTo('record', { id: record.id })}
        >
          ⋯
        </span>
      </div>

      {/* Full width photo */}
      <div className="w-full h-[300px] bg-gradient-to-br from-[#F0D0D0] to-[#E8C0C0] flex items-center justify-center text-8xl object-cover">
        {image_path ? (
          <img src={image_path} alt="" className="w-full h-full object-cover" />
        ) : (
          '🍰🧋'
        )}
      </div>

      {/* Rating */}
      <div className="text-center py-4">
        <div className="text-[32px]">{renderSpoons(rating)}</div>
        <div className="text-[32px] font-bold text-caramel flex items-center justify-center gap-2">
          {rating} 勺
          {rating >= 5 && <span className="text-xl animate-wiggle" style={{ animationDelay: '0.5s' }}>✨</span>}
        </div>
        <div className="text-sm text-text-secondary mt-0.5">
          "{RATING_TEXTS[rating] || '还不错'}"
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 px-5 pb-4 justify-center">
        {tags.map((t, i) => (
          <span key={i} className="px-3.5 py-1.5 bg-butter rounded-pill text-xs text-caramel font-medium">
            {t}
          </span>
        ))}
      </div>

      {/* Category badge */}
      <div className="flex justify-center px-5 pb-2">
        <span className={`text-xs font-medium px-3 py-1 rounded-pill ${
          category === '饮品' ? 'bg-strawberry/10 text-strawberry'
          : category === '冰品' ? 'bg-[#4A90D9]/10 text-[#4A90D9]'
          : 'bg-matcha/10 text-matcha'
        }`}>
          {category === '饮品' ? '🧋 饮品' : category === '冰品' ? '🍦 冰品' : '🍰 甜品'}
        </span>
      </div>

      {/* Name */}
      {name && (
        <div className="text-center text-lg font-semibold text-text-primary px-5 pb-3">
          {name}
        </div>
      )}

      {/* Shop info */}
      <div className="bg-card-bg mx-5 mb-3 rounded p-4 shadow-card">
        {!is_homemade && shop_name && (
          <div
            className="text-sm text-text-primary leading-relaxed cursor-pointer hover:text-caramel transition-colors"
            onClick={() => navigateTo('shop-detail', { shop: shop_name })}
          >
            📍 {shop_name}
          </div>
        )}
        {location && (
          <div className="text-sm text-text-secondary leading-relaxed">{location}</div>
        )}
        {is_homemade && <div className="text-sm text-matcha">🏠 自制</div>}
        {!is_homemade && price && (
          <div className="text-sm text-caramel font-semibold leading-relaxed">¥ {price}</div>
        )}
      </div>

      {/* Note */}
      {note && (
        <div className="bg-card-bg mx-5 mb-3 rounded p-4 shadow-card text-sm text-text-primary leading-relaxed">
          💬 {note}
        </div>
      )}

      {/* Timestamp */}
      <div className="text-center text-xs text-text-muted py-2">
        {new Date(created_at).toLocaleString('zh-CN')}
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 pb-5">
        <button className="btn-pill bg-caramel text-white" onClick={handleShare} disabled={sharing}>
          {sharing ? '🤖 生成中…' : '📸 生成分享卡片'}
        </button>
        <button
          className="btn-pill bg-white text-caramel border-[1.5px] border-border"
          onClick={() => navigateTo('edit', { id: record.id })}
        >
          ✏️ 编辑
        </button>
        <button
          className="btn-pill bg-white text-strawberry border-[1.5px] border-border"
          onClick={handleDelete}
        >
          🗑️ 删除
        </button>
      </div>
    </div>
  )
}
