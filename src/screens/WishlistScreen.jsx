import { useState } from 'react'

export default function WishlistScreen({ navigateTo, goBack }) {
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('tangji-wishlist')
    return saved ? JSON.parse(saved) : []
  })
  const [doneList, setDoneList] = useState(() => {
    const saved = localStorage.getItem('tangji-wishlist-done')
    return saved ? JSON.parse(saved) : []
  })
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍰')

  const addWish = () => {
    if (!newName.trim()) return
    const item = {
      id: 'w' + Date.now(),
      emoji: newEmoji,
      name: newName.trim(),
      note: newNote.trim() || '想吃',
      date: new Date().toISOString().slice(0, 10),
    }
    const updated = [item, ...wishlist]
    setWishlist(updated)
    localStorage.setItem('tangji-wishlist', JSON.stringify(updated))
    setNewName('')
    setNewNote('')
    setShowAdd(false)
  }

  const markAsEaten = (item) => {
    const updatedWish = wishlist.filter((w) => w.id !== item.id)
    setWishlist(updatedWish)
    localStorage.setItem('tangji-wishlist', JSON.stringify(updatedWish))
    const doneItem = { id: item.id, name: item.name, date: new Date().toISOString().slice(0, 10) }
    const updatedDone = [doneItem, ...doneList]
    setDoneList(updatedDone)
    localStorage.setItem('tangji-wishlist-done', JSON.stringify(updatedDone))
    navigateTo('record', { wish: item.name })
  }

  return (
    <div>
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={goBack}>
          ← 返回
        </span>
        <span className="text-[17px] font-bold text-text-primary">想吃清单</span>
        <span
          className="text-xl text-caramel cursor-pointer"
          onClick={() => setShowAdd(!showAdd)}
        >
          ✚
        </span>
      </div>

      <div className="px-5 pt-3">
        {/* Add form */}
        {showAdd && (
          <div className="bg-card-bg rounded p-4 mb-4 shadow-card">
            <div className="flex gap-2 mb-3">
              <div className="text-3xl flex items-center">{newEmoji}</div>
              <div className="flex gap-1 flex-wrap items-center">
                {['🍰', '🍦', '🧋', '🍮', '🧁', '🍪', '🥮', '🍩', '🍫', '🥧'].map((e) => (
                  <span
                    key={e}
                    className={`cursor-pointer text-lg transition-all ${newEmoji === e ? 'scale-125' : 'opacity-40 hover:opacity-80'}`}
                    onClick={() => setNewEmoji(e)}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
            <input
              className="form-input mb-3"
              placeholder="想吃的名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWish()}
            />
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                placeholder="备注（选填）"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWish()}
              />
              <button className="px-5 py-3 bg-caramel text-white rounded-pill text-sm font-medium" onClick={addWish}>
                添加
              </button>
            </div>
          </div>
        )}

        {/* Wishlist */}
        {wishlist.length > 0 && (
          <>
            <div className="text-sm font-semibold text-text-secondary pb-3 pt-1">
              还没吃到的
            </div>
            {wishlist.map((item) => (
              <div key={item.id} className="bg-card-bg rounded p-3.5 mb-2.5 shadow-card flex items-center gap-3">
                <div className="w-11 h-11 rounded-sm bg-cream flex items-center justify-center text-[22px]">
                  {item.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{item.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">📍 {item.note} · 收藏于{item.date.slice(5)}</div>
                </div>
                <button
                  className="px-3.5 py-1.5 rounded-pill text-xs bg-matcha text-white whitespace-nowrap"
                  onClick={() => markAsEaten(item)}
                >
                  我吃了 ✓
                </button>
              </div>
            ))}
          </>
        )}

        {/* Done list */}
        {doneList.length > 0 && (
          <>
            <div className="text-sm font-semibold text-matcha py-3 pt-4">
              ── 吃到了 ──
            </div>
            {doneList.map((item) => (
              <div key={item.id} className="text-sm text-text-secondary py-2">
                ✓ {item.name} · 已记录于 {item.date.slice(5)}
              </div>
            ))}
          </>
        )}

        {wishlist.length === 0 && !showAdd && (
          <div className="text-center text-text-muted py-8">点击 ✚ 添加想吃的</div>
        )}
      </div>
    </div>
  )
}
