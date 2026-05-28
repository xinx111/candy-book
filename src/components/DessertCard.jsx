import { useState, useEffect } from 'react'
import { getRecordImage } from '../data/store'

export default function DessertCard({ record, onClick, onDelete, onShopClick, onShare }) {
  const { has_image, rating, texture, flavor, shop_name, price, is_homemade, name, id } = record
  const [imgSrc, setImgSrc] = useState(null)

  useEffect(() => { if (has_image) getRecordImage(id).then(setImgSrc) }, [id, has_image])
  const tags = [...(texture?.slice(0, 2) || []), ...(flavor?.slice(0, 2) || [])].slice(0, 3)
  const spoons = (() => { const n = Math.floor(Number(rating)); return isNaN(n) || n < 0 ? '' : '🥄'.repeat(Math.min(n, 10)) })()

  // 伪随机旋转角度（基于 id 保持一致性）
  const rot = (() => {
    let h = 0
    for (const c of (id || '')) h = ((h << 5) - h) + c.charCodeAt(0)
    return (h % 5) * 0.7 - 1.4  // -1.4 ~ 2.1
  })()

  const bgGradient = flavor?.includes('抹茶')
    ? 'from-[#C8E6C9] to-[#A5D6A7]'
    : flavor?.includes('可可')
    ? 'from-[#D7CCC8] to-[#BCAAA4]'
    : flavor?.includes('芝士')
    ? 'from-[#FFF9C4] to-[#FFF176]'
    : 'from-[#F0D0D0] to-[#E8C0C0]'

  const emoji = flavor?.includes('抹茶')
    ? '🍵'
    : flavor?.includes('可可')
    ? '🍫'
    : flavor?.includes('芝士')
    ? '🧀'
    : '🍰🧋'

  return (
    <div
      onClick={onClick}
      style={{ transform: `rotate(${rot}deg)` }}
      className="bg-card-bg rounded-lg mb-5 cursor-pointer relative shadow-[0_0_0_3px_white,0_4px_12px_rgba(0,0,0,0.1)]"
    >
      {/* 和纸胶带：一半在背景一半在卡片上 */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10" style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.08))' }}>
        <div
          className="w-10 h-8"
          style={{
            background: 'rgba(255, 240, 240, 0.3)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(200, 180, 170, 0.1) 6px, rgba(200, 180, 170, 0.1) 10px)',
            clipPath: 'polygon(0% 20%, 4% 0%, 8% 25%, 12% 5%, 16% 30%, 20% 10%, 24% 35%, 96% 10%, 100% 30%, 97% 50%, 100% 70%, 98% 90%, 95% 70%, 16% 90%, 12% 70%, 8% 95%, 4% 75%, 0% 100%)',
          }}
        />
      </div>

      {/* 内容区（含 overflow-hidden 用来裁切圆角） */}
      <div className="overflow-hidden rounded-lg">
        {/* Image */}
        <div
          className={`w-full h-[200px] bg-gradient-to-br ${bgGradient} flex items-center justify-center text-6xl object-cover`}
        >
        {imgSrc ? (
          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          emoji
        )}
      </div>

      {/* 和纸胶带：把整张卡片贴到背景上 */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10" style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.08))' }}>
        <div
          className="w-20 h-5"
          style={{
            background: 'rgba(255, 240, 240, 0.85)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(200, 180, 170, 0.15) 6px, rgba(200, 180, 170, 0.15) 10px)',
            clipPath: 'polygon(0% 20%, 4% 0%, 8% 25%, 12% 5%, 16% 30%, 20% 10%, 24% 35%, 96% 10%, 100% 30%, 97% 50%, 100% 70%, 98% 90%, 95% 70%, 16% 90%, 12% 70%, 8% 95%, 4% 75%, 0% 100%)',
          }}
        />
      </div>

      {/* Share button */}
      {onShare && (
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          {onDelete && (
            <span
              className="w-7 h-7 bg-white/85 backdrop-blur rounded-full flex items-center justify-center text-[13px] text-strawberry cursor-pointer shadow-sm hover:bg-strawberry hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('确定删除这条记录？')) {
                  onDelete(record.id)
                }
              }}
            >
              ✕
            </span>
          )}
          <span
            className="w-7 h-7 bg-white/85 backdrop-blur rounded-full flex items-center justify-center text-[13px] text-caramel cursor-pointer shadow-sm hover:bg-caramel hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onShare(record)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </span>
        </div>
      )}

      {/* Legacy delete overlay (only if onShare is not set) */}
      {!onShare && onDelete && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className="w-7 h-7 bg-white/85 backdrop-blur rounded-full flex items-center justify-center text-[13px] text-strawberry cursor-pointer shadow-sm hover:bg-strawberry hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm('确定删除这条记录？')) {
                onDelete(record.id)
              }
            }}
          >
            ✕
          </span>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {tags.map((t, i) => (
            <span key={i} className="card-tag">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Rating */}
      <div className="absolute bottom-[52px] right-3 text-lg tracking-[2px] bg-white/85 backdrop-blur px-2.5 py-1 rounded-pill">
        {spoons}
      </div>

      {/* Name */}
      {name && (
        <div className="px-3.5 pt-1.5">
          <span className="text-sm font-semibold text-text-primary truncate block">{name}</span>
        </div>
      )}

      {/* Info bar */}
      <div className="flex justify-between items-center px-3.5 py-3">
        <span
          className={`text-sm font-medium ${is_homemade ? 'text-matcha' : 'text-text-primary'}`}
          onClick={(e) => {
            if (!is_homemade && shop_name && onShopClick) {
              e.stopPropagation()
              onShopClick(shop_name)
            }
          }}
        >
          {is_homemade ? `🏠 自制` : `📍 ${shop_name || '未知店铺'}`}
        </span>
        <span className="text-[13px] text-caramel font-semibold">
          {is_homemade ? '—' : price ? `¥${price}` : ''}
        </span>
      </div>
    </div>
    </div>
  )
}
