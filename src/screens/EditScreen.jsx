import { useState, useEffect } from 'react'
import { getRecord, updateRecord } from '../data/store'
import {
  SWEETNESS_OPTIONS,
  TEXTURE_OPTIONS,
  FLAVOR_OPTIONS,
  TEMPERATURE_OPTIONS,
} from '../data/constants'

export default function EditScreen({ params, navigateTo, goBack, loadRecords }) {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(3.5)
  const [itemName, setItemName] = useState('')
  const [shopName, setShopName] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [createdAt, setCreatedAt] = useState('')

  useEffect(() => {
    if (params?.id) {
      getRecord(params.id).then((r) => {
        if (r) {
          setRecord(r)
          setRating(r.rating)
          setItemName(r.name || '')
          setShopName(r.shop_name || '')
          setLocation(r.location || '')
          setPrice(r.price ? String(r.price) : '')
          setNote(r.note || '')
          setCreatedAt(r.created_at.slice(0, 16))
        }
        setLoading(false)
      })
    }
  }, [params?.id])

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">加载中…</div>
  if (!record) return <div className="flex items-center justify-center h-64 text-text-muted">记录不存在</div>

  const handleSave = async () => {
    await updateRecord(record.id, {
      rating,
      name: itemName,
      shop_name: shopName,
      location,
      price: price ? Number(price) : null,
      note,
      created_at: createdAt ? new Date(createdAt).toISOString() : record.created_at,
    })
    await loadRecords()
    goBack()
  }

  const ratingSpoons = (() => { const n = Math.floor(Number(rating)); return isNaN(n) || n < 0 ? '' : '🥄'.repeat(Math.min(n, 10)) })()

  return (
    <div>
      <div className="nav-bar">
        <span className="text-base text-text-secondary cursor-pointer" onClick={goBack}>
          ✕ 取消
        </span>
        <span className="text-[17px] font-bold text-text-primary">编辑</span>
        <span
          className="text-sm text-matcha font-semibold cursor-pointer"
          onClick={handleSave}
        >
          保存 ✓
        </span>
      </div>

      <div className="px-5 pt-4">
        {/* Photo */}
        <div className="w-full h-[220px] bg-gradient-to-br from-[#F0D0D0] to-[#E8C0C0] rounded flex items-center justify-center text-5xl cursor-pointer">
          {record.image_path ? (
            <img src={record.image_path} alt="" className="w-full h-full object-cover rounded" />
          ) : (
            '🍰🧋'
          )}
        </div>

        {/* Rating */}
        <div className="py-4 text-lg text-center">
          评分 🥄{ratingSpoons}{' '}
          <span className="text-xs text-text-muted block">(可拖动调整)</span>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full mt-2 accent-strawberry"
          />
          <span className="text-caramel font-bold text-sm">{rating} 勺</span>
        </div>

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">店名</div>
          <input className="form-input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </div>
        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">名称（选填）</div>
          <input className="form-input" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        </div>
        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">地址（选填）</div>
          <input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">价格</div>
          <input className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} type="number" />
        </div>
        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">备注</div>
          <textarea className="form-input h-14 resize-none" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">
            记录时间 <span className="text-[13px] text-strawberry cursor-pointer ml-2">[修改]</span>
          </div>
          <input
            type="datetime-local"
            className="form-input text-sm"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
