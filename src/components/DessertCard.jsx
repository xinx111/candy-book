export default function DessertCard({ record, onClick, onDelete, onShopClick, onShare }) {
  const { image_path, rating, texture, flavor, shop_name, price, is_homemade, name, id } = record
  const tags = [...(texture?.slice(0, 2) || []), ...(flavor?.slice(0, 2) || [])].slice(0, 3)
  const spoons = (() => { const n = Math.floor(Number(rating)); return isNaN(n) || n < 0 ? '' : '🥄'.repeat(Math.min(n, 10)) })()

  // 伪随机旋转角度（基于 id 保持一致性）
  const rot = (() => {
    let h = 0
    for (const c of (id || '')) h = ((h << 5) - h) + c.charCodeAt(0)
    return ((h % 7) - 3) + (h % 2) * 0.5  // -3 ~ 3.5
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

  // 胶带颜色
  const tapeColor =
    rot > 1 ? 'bg-yellow-200/70' :
    rot < -1 ? 'bg-blue-200/70' :
    'bg-pink-200/70'

  return (
    <div
      onClick={onClick}
      style={{ transform: `rotate(${rot}deg)`, boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)' }}
      className="bg-card-bg rounded-lg overflow-hidden mb-5 cursor-pointer relative transition-all duration-200 hover:scale-[1.01]"
    >
      {/* 胶带 */}
      <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-5 ${tapeColor} rounded-sm z-20`} />

      {/* Image */}
      <div
        className={`w-full h-[200px] bg-gradient-to-br ${bgGradient} flex items-center justify-center text-6xl object-cover`}
      >
        {image_path ? (
          <img src={image_path} alt="" className="w-full h-full object-cover" />
        ) : (
          emoji
        )}
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
            📤
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
  )
}
