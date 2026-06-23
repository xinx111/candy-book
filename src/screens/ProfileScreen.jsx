import { useState, useMemo, useRef } from 'react'
import { clearAll, getMonthlyStats } from '../data/store'
import { ACHIEVEMENTS } from '../data/constants'
import { formatPrice } from '../utils/format'

const AVATARS = ['🍰', '🧋', '🍦', '🍮', '🧁', '🍪', '🥮', '🍩', '🍫', '🥧', '🍨', '🍭']

export default function ProfileScreen({ records, navigateTo, goBack, loadRecords }) {
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('tangji-nickname') || '甜品收藏家'
  })
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem('tangji-avatar') || '🍰'
  })
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(nickname)
  const [signature, setSignature] = useState(() => {
    return localStorage.getItem('tangji-signature') || '祝你每天都是甜甜的 🍰'
  })
  const [editingSig, setEditingSig] = useState(false)
  const [sigInput, setSigInput] = useState(signature)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [birthday, setBirthdayState] = useState(() => {
    return localStorage.getItem('tangji-birthday') || ''
  })
  const [birthdayInput, setBirthdayInput] = useState(birthday)
  const [showAchievements, setShowAchievements] = useState(false)
  const avatarFileRef = useRef(null)
  const [cropImg, setCropImg] = useState(null)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, size: 200 })
  const cropContainerRef = useRef(null)

  const stats = useMemo(() => getMonthlyStats(records), [records])

  const unlocked = useMemo(() => {
    return new Set(ACHIEVEMENTS.filter((a) => a.check(records)).map((a) => a.id))
  }, [records])

  // 甜品体质分析：统计出现最多的风味/温度/店铺
  const foodPersonality = useMemo(() => {
    if (records.length === 0) return null
    const flavors = {}
    for (const r of records) {
      for (const f of r.flavor || []) { flavors[f] = (flavors[f] || 0) + 1 }
    }
    const sorted = Object.entries(flavors).sort((a, b) => b[1] - a[1])
    const topFlavor = sorted[0]?.[0]
    const profileMap = {
      '抹茶': { emoji: '🍵', label: '抹茶脑袋' },
      '可可': { emoji: '🍫', label: '巧克力上瘾' },
      '咖啡': { emoji: '☕', label: '咖啡续命' },
      '芝士': { emoji: '🧀', label: '芝士就是力量' },
      '果味': { emoji: '🍓', label: '清爽水果控' },
      '花香': { emoji: '🌸', label: '浪漫花系舌' },
      '酒香': { emoji: '🍷', label: '微醺甜品家' },
      '坚果': { emoji: '🥜', label: '坚果养生派' },
      '焦糖': { emoji: '🍮', label: '焦糖狂热者' },
      '椰香': { emoji: '🥥', label: '椰风爱好者' },
      '茶味': { emoji: '🫖', label: '茶系青年' },
      '豆乳': { emoji: '🧋', label: '豆乳温柔派' },
    }
    return topFlavor ? profileMap[topFlavor] : null
  }, [records])

  const saveNickname = () => {
    const val = nameInput.trim() || '甜品收藏家'
    setNickname(val)
    localStorage.setItem('tangji-nickname', val)
    setEditingName(false)
  }

  const changeAvatar = (emoji) => {
    setAvatar(emoji)
    localStorage.setItem('tangji-avatar', emoji)
    setShowAvatarPicker(false)
  }

  const saveSignature = () => {
    const val = sigInput.trim() || '祝你每天都是甜甜的 🍰'
    setSignature(val)
    localStorage.setItem('tangji-signature', val)
    setEditingSig(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropImg(ev.target.result)
      setCropBox({ x: 0, y: 0, size: 200 })
    }
    reader.readAsDataURL(file)
  }

  /** 执行裁剪并保存 */
  const handleCropConfirm = async () => {
    if (!cropImg) return
    const img = new Image()
    img.onload = () => {
      // 计算实际比例
      const container = cropContainerRef.current
      if (!container) return
      const scale = img.naturalWidth / container.clientWidth
      const sx = cropBox.x * scale
      const sy = cropBox.y * scale
      const sw = cropBox.size * scale
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, sw, sw, 0, 0, 200, 200)
      const cropped = canvas.toDataURL('image/jpeg', 0.7)
      setAvatar(cropped)
      localStorage.setItem('tangji-avatar', cropped)
      setShowAvatarPicker(false)
      setCropImg(null)
    }
    img.src = cropImg
  }

  // 裁剪框拖拽逻辑
  const startCropDrag = (clientX, clientY) => {
    const container = cropContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = clientX - rect.left
    const startY = clientY - rect.top
    const orig = { ...cropBox }
    const onMove = (mx, my) => {
      const dx = mx - rect.left - startX
      const dy = my - rect.top - startY
      let nx = orig.x + dx
      let ny = orig.y + dy
      const max = container.clientWidth - orig.size
      nx = Math.max(0, Math.min(nx, max))
      ny = Math.max(0, Math.min(ny, max))
      setCropBox((prev) => ({ ...prev, x: nx, y: ny }))
    }
    const onEnd = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
    const onMouseMove = (e) => { e.preventDefault(); onMove(e.clientX, e.clientY) }
    const onMouseUp = onEnd
    const onTouchMove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }
    const onTouchEnd = onEnd
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  const saveBirthday = () => {
    setBirthdayState(birthdayInput)
    localStorage.setItem('tangji-birthday', birthdayInput)
    setShowBirthdayPicker(false)
  }

  const handleDeleteAll = () => {
    if (window.confirm('确定要删除所有记录吗？此操作不可恢复。')) {
      clearAll().then(() => loadRecords())
    }
  }

  const menuItems = [
    { icon: '📋', label: '想吃清单', color: 'text-strawberry', onClick: () => navigateTo('wishlist') },
    { icon: '🏆', label: '成就墙', color: 'text-caramel', onClick: () => setShowAchievements(!showAchievements) },
    { icon: '⚙️', label: '设置', color: 'text-text-secondary', onClick: () => navigateTo('settings') },
  ]

  return (
    <div>
      {/* Hero header */}
      <div className="bg-gradient-to-br from-caramel to-[#6B3E2A] px-5 pt-4 pb-6 mx-[-1px]">
        {/* 🎂 Birthday celebration banner */}
        {birthday && (() => {
          const today = new Date()
          const bd = birthday.split('-')
          if (bd.length === 3 && Number(bd[1]) === today.getMonth() + 1 && Number(bd[2]) === today.getDate()) {
            return (
              <div className="bg-white/20 rounded-lg py-2 px-3 mb-3 text-center animate-pulse-glow">
                <div className="text-white text-sm font-semibold">🎉🎂 生日快乐！</div>
                <div className="text-white/70 text-xs mt-0.5">今天甜品全归你 🍰✨</div>
              </div>
            )
          }
          return null
        })()}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="relative w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl cursor-pointer hover:bg-white/30 transition-colors overflow-hidden"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          >
            {avatar && avatar.startsWith('data:') ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              avatar
            )}
          </div>
          {/* Nickname + stats */}
          <div className="flex-1">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  className="form-input py-1 text-sm flex-1 bg-white/90"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                  autoFocus
                />
                <button className="text-white text-sm font-medium" onClick={saveNickname}>✓</button>
              </div>
            ) : (
              <div
                className="text-lg font-bold text-white cursor-pointer hover:opacity-80"
                onClick={() => { setNameInput(nickname); setEditingName(true) }}
              >
                {nickname} <span className="text-sm opacity-60">✏️</span>
              </div>
            )}
            <div className="text-sm text-white/70 mt-0.5">
              已记录 {records.length} 块甜品
            </div>
          </div>
        </div>

        {/* Signature */}
        {editingSig ? (
          <div className="flex gap-2 mt-2">
            <input
              className="form-input py-1 text-xs flex-1 bg-white/90"
              value={sigInput}
              onChange={(e) => setSigInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveSignature()}
              autoFocus
            />
            <button className="text-white text-sm font-medium" onClick={saveSignature}>✓</button>
          </div>
        ) : (
          <div
            className="text-xs text-white/50 mt-1.5 cursor-pointer hover:text-white/70 transition-colors"
            onClick={() => { setSigInput(signature); setEditingSig(true) }}
          >
            {signature} <span className="text-[10px] opacity-50">✏️</span>
          </div>
        )}

        <div className="text-[10px] text-white/30 mt-1.5 flex items-center gap-2">
          <span
            className="cursor-pointer hover:text-white/50 transition-colors"
            onClick={() => { setBirthdayInput(birthday); setShowBirthdayPicker(!showBirthdayPicker) }}
          >
            🎂 {birthday || '添加生日'}
          </span>
        </div>
        {showBirthdayPicker && (
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              className="form-input py-1 text-xs flex-1 bg-white/90"
              value={birthdayInput}
              onChange={(e) => setBirthdayInput(e.target.value)}
            />
            <button className="text-white text-sm font-medium" onClick={saveBirthday}>✓</button>
          </div>
        )}

        {/* Avatar picker */}
        {showAvatarPicker && (
          <div className="mt-3 bg-white/15 rounded-lg p-3">
            <div className="text-xs text-white/70 mb-2">选择头像</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {AVATARS.map((e) => (
                <span
                  key={e}
                  className={`text-xl cursor-pointer transition-all hover:scale-125 ${avatar === e ? 'scale-125' : 'opacity-60 hover:opacity-100'}`}
                  onClick={() => changeAvatar(e)}
                >
                  {e}
                </span>
              ))}
            </div>
            <div
              className="flex items-center gap-2 text-xs text-white/80 cursor-pointer hover:text-white pt-2 border-t border-white/20"
              onClick={() => avatarFileRef.current?.click()}
            >
              📷 上传照片
            </div>
            <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        )}

        {/* Quick stats row */}
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-white/15 rounded-lg py-2 text-center">
            <div className="text-white font-bold text-lg">{records.length}</div>
            <div className="text-[11px] text-white/60">总计·块</div>
          </div>
          <div className="flex-1 bg-white/15 rounded-lg py-2 text-center">
            <div className="text-white font-bold text-lg">{stats.monthCount}</div>
            <div className="text-[11px] text-white/60">本月·块</div>
          </div>
          <div className="flex-1 bg-white/15 rounded-lg py-2 text-center">
            <div className="text-white font-bold text-lg">¥{formatPrice(stats.totalSpent)}</div>
            <div className="text-[11px] text-white/60">总计花费</div>
          </div>
          <div className="flex-1 bg-white/15 rounded-lg py-2 text-center">
            <div className="text-white font-bold text-lg">🥄{stats.avgRating}</div>
            <div className="text-[11px] text-white/60">平均评分</div>
          </div>
        </div>

        {/* 甜品体质 */}
        {foodPersonality && (
          <div className="mt-3 text-center">
            <span className="inline-block px-3 py-1 bg-white/15 rounded-pill text-xs text-white/80">
              你的甜品体质：{foodPersonality.emoji} {foodPersonality.label}
            </span>
          </div>
        )}
      </div>

      {/* Menu list */}
      <div className="px-4 pt-3">
        {menuItems.map((item) => (
          <div key={item.label}>
            <div
              className="flex items-center justify-between py-3.5 px-3 bg-card-bg rounded-lg mb-1.5 shadow-card cursor-pointer hover:opacity-80 transition-opacity"
              onClick={item.onClick}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-text-primary">{item.label}</span>
              </div>
              <span className="text-text-muted text-lg">›</span>
            </div>

            {/* Achievements inline */}
            {item.label === '成就墙' && showAchievements && (
              <div className="px-1 pb-3 mb-1.5">
                <div className="grid grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map((a) => {
                    const isUnlocked = unlocked.has(a.id)
                    return (
                      <div
                        key={a.id}
                        className={`rounded-lg p-2.5 text-center transition-all ${
                          isUnlocked
                            ? 'bg-caramel/10 border border-caramel/20'
                            : 'bg-gray-50 border border-border opacity-50'
                        }`}
                      >
                        <div className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>{a.emoji}</div>
                        <div className={`text-xs font-semibold mt-1 ${isUnlocked ? 'text-caramel' : 'text-text-muted'}`}>
                          {a.name}
                        </div>
                        <div className="text-[10px] text-text-muted">{a.desc}</div>
                        {isUnlocked && <div className="text-[9px] text-matcha mt-0.5">✓ 已解锁</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* About */}
      <div className="text-center pt-6 pb-8">
        <div className="text-sm text-caramel font-semibold">🍰 糖记 v1.0.0</div>
        <div className="text-xs text-text-muted mt-1">祝你每天都是甜甜的</div>
        <div className="text-[11px] text-text-muted mt-0.5">所有数据仅存储于你的设备</div>
        <div
          className="text-xs text-strawberry mt-5 cursor-pointer"
          onClick={handleDeleteAll}
        >
          删除所有数据
        </div>
      </div>

      {/* 裁剪头像弹窗 */}
      {cropImg && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-5">
          <div className="bg-white rounded-xl overflow-hidden max-w-sm w-full">
            <div className="p-4">
              <div className="text-sm font-semibold text-text-primary mb-3">调整头像</div>
              <div
                ref={cropContainerRef}
                className="relative w-full aspect-square bg-black rounded-lg overflow-hidden touch-none"
                onMouseDown={(e) => startCropDrag(e.clientX, e.clientY)}
                onTouchStart={(e) => startCropDrag(e.touches[0].clientX, e.touches[0].clientY)}
              >
                <img src={cropImg} alt="" className="w-full h-full object-contain" />
                {/* 裁剪框 */}
                <div
                  className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                  style={{ left: cropBox.x, top: cropBox.y, width: cropBox.size, height: cropBox.size }}
                >
                  <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-white" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-4 pb-4">
              <button className="flex-1 py-2.5 bg-caramel text-white rounded-pill text-sm" onClick={handleCropConfirm}>
                ✅ 确认
              </button>
              <button className="flex-1 py-2.5 bg-white text-text-secondary border border-border rounded-pill text-sm" onClick={() => setCropImg(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
