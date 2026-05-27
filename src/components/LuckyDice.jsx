import { useState, useEffect, useCallback } from 'react'
import { getRecordImage } from '../data/store'

const COLORS = {
  caramel: '#8B5E3C',
  strawberry: '#E8716D',
  matcha: '#7DA87B',
  butter: '#F5D6A8',
}

export default function LuckyDice({ records, onClose, navigateTo }) {
  const [current, setCurrent] = useState(null)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState([])
  const [currentImage, setCurrentImage] = useState(null)

  // 当 current 变化时加载图片
  useEffect(() => {
    if (current?.has_image) getRecordImage(current.id).then(setCurrentImage)
    else setCurrentImage(null)
  }, [current])

  // 过滤掉自制（也可以不过滤，更随机）
  const pool = records.filter((r) => !r.is_homemade || Math.random() > 0.5)

  const roll = useCallback(() => {
    if (pool.length === 0) return
    setRolling(true)
    // 快速切换动画
    let count = 0
    const totalFlashes = 8 + Math.floor(Math.random() * 5)
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length)
      setCurrent(pool[randomIdx])
      count++
      if (count >= totalFlashes) {
        clearInterval(interval)
        // 最终结果
        const finalIdx = Math.floor(Math.random() * pool.length)
        const final = pool[finalIdx]
        setCurrent(final)
        setRolling(false)
        setHistory((prev) => {
          const next = [final, ...prev]
          return next.slice(0, 20)
        })
      }
    }, 80)
  }, [pool])

  if (pool.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="text-5xl mb-4">🎲</div>
          <div className="text-base font-semibold text-text-primary mb-2">还没有记录</div>
          <div className="text-sm text-text-secondary mb-6">先去记录一些甜品吧 🍰</div>
          <button
            className="px-6 py-2.5 bg-caramel text-white rounded-pill text-sm font-medium"
            onClick={onClose}
          >
            知道了
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-bold text-text-primary">🎲 命运骰子</span>
          <span
            className="text-lg text-text-muted cursor-pointer leading-none"
            onClick={onClose}
          >
            ✕
          </span>
        </div>

        {/* Card area */}
        {current ? (
          <div
            className={`rounded-xl overflow-hidden shadow-lg mb-4 cursor-pointer transition-all duration-200 ${
              rolling ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
            }`}
            onClick={() => {
              if (!rolling && current) {
                onClose()
                navigateTo('detail', { id: current.id })
              }
            }}
          >
            {/* Image */}
            <div className="w-full h-44 bg-gradient-to-br from-[#F0D0D0] to-[#E8C0C0] flex items-center justify-center text-5xl object-cover">
              {currentImage ? (
                <img src={currentImage} alt="" className="w-full h-full object-cover" />
              ) : current.has_image ? (
                <span className="text-5xl opacity-30">🍰</span>
              ) : (
                current.flavor?.includes('抹茶') ? '🍵' : current.flavor?.includes('可可') ? '🍫' : '🍰'
              )}
            </div>
            {/* Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-text-primary truncate max-w-[70%]">
                  {current.name || (current.flavor || []).join('·') || '未知甜品'}
                </span>
                <span className="text-sm">{'🥄'.repeat(Math.min(Math.floor(Number(current.rating)), 10))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  {current.is_homemade ? '🏠 自制' : `📍 ${current.shop_name || '未知店铺'}`}
                </span>
                {!current.is_homemade && current.price && (
                  <span className="text-xs text-caramel font-semibold">¥{current.price}</span>
                )}
              </div>
              {/* Tags */}
              {(current.flavor?.length > 0 || current.texture?.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[...(current.flavor || []), ...(current.texture || [])].slice(0, 3).map((t, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-butter rounded-pill text-caramel">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="text-6xl mb-3">🎲</div>
              <div className="text-sm text-text-secondary">点击下面按钮试试运气</div>
            </div>
          </div>
        )}

        {/* Roll button */}
        <button
          className={`w-full py-3 rounded-pill text-sm font-semibold transition-all ${
            rolling
              ? 'bg-[#F0D8D8] text-text-muted'
              : 'bg-gradient-to-r from-caramel to-[#A07050] text-white shadow-md active:scale-95'
          }`}
          onClick={roll}
          disabled={rolling}
        >
          {rolling ? '🎲 摇动中…' : current ? '🎲 再摇一次' : '🎲 摇一摇'}
        </button>

        {/* Tap hint */}
        {current && !rolling && (
          <div className="text-center text-[10px] text-text-muted mt-2">
            点击卡片查看详情
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="text-[11px] text-text-muted mb-2 font-medium">摇到过的：</div>
            <div className="flex flex-wrap gap-1.5">
              {history.slice(1, 6).map((item, i) => (
                <span
                  key={item.id + '-' + i}
                  className="text-[10px] px-2 py-0.5 bg-[#F0D8D8] rounded-pill text-text-secondary cursor-pointer"
                  onClick={() => {
                    onClose()
                    navigateTo('detail', { id: item.id })
                  }}
                >
                  {item.shop_name || (item.flavor || []).join('·') || '记录'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
