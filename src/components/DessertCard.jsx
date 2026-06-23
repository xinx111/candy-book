import { useState, useEffect } from 'react'
import { getRecordImage } from '../data/store'
import { formatPrice } from '../utils/format'

export default function DessertCard({ record, onClick, onDelete, onShopClick, onShare }) {
  const { has_image, rating, texture, flavor, shop_name, price, is_homemade, name, id } = record
  const [imgSrc, setImgSrc] = useState(null)
  useEffect(() => { if (has_image) getRecordImage(id).then(setImgSrc) }, [id, has_image])
  const tags = [...(texture?.slice(0, 2) || []), ...(flavor?.slice(0, 2) || [])].slice(0, 3)
  const spoons = (() => { const n = Math.floor(Number(rating)); return isNaN(n) || n < 0 ? '' : '🥄'.repeat(Math.min(n, 10)) })()

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
    <div className="dessert-card anim-float" onClick={onClick}>
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

      {/* Share button */}
      {onShare && (
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          {onDelete && (
            <span
              className="w-7 h-7 bg-white/85 rounded-full flex items-center justify-center text-[13px] text-strawberry cursor-pointer shadow-sm hover:bg-strawberry hover:text-white transition-colors"
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
            className="w-7 h-7 bg-white/85 rounded-full flex items-center justify-center text-[13px] text-caramel cursor-pointer shadow-sm hover:bg-caramel hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onShare(record)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </span>
        </div>
      )}

      {/* Legacy delete overlay (only if onShare is not set) */}
      {!onShare && onDelete && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className="w-7 h-7 bg-white/85 rounded-full flex items-center justify-center text-[13px] text-strawberry cursor-pointer shadow-sm hover:bg-strawberry hover:text-white transition-colors"
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
      <div className="absolute bottom-[52px] right-3 text-lg tracking-[2px] bg-white/85 px-2.5 py-1 rounded-pill">
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
          {is_homemade ? '—' : price ? `¥${formatPrice(price)}` : ''}
        </span>
      </div>
    </div>
  )
}
