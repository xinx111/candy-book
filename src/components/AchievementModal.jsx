import { useState, useEffect } from 'react'

export default function AchievementModal({ achievement, onClose, remaining = 0 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={`absolute inset-0 z-20 flex items-end justify-center bg-text-primary/50 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full bg-white rounded-t-lg px-6 pt-8 pb-10 text-center shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">{achievement.emoji}</div>
        <div className="text-lg font-bold text-strawberry mb-1">新成就解锁！</div>
        <div className="text-[15px] text-text-primary mb-1">🏅 {achievement.name}</div>
        <div className="text-[13px] text-text-secondary mb-5">{achievement.desc}</div>
        <button
          className="px-16 py-3.5 bg-strawberry text-white rounded-pill text-base font-semibold"
          onClick={onClose}
        >
          {remaining > 0 ? `🎉 查看下一个（${remaining}个）` : '👍 好的'}
        </button>
      </div>
    </div>
  )
}
