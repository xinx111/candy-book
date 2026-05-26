import { useState, useRef, useEffect, useMemo } from 'react'
import { addRecord, updateRecord, getRecord } from '../data/store'
import { compressImage } from '../utils/image'
import {
  SWEETNESS_OPTIONS,
  RATING_TEXTS,
} from '../data/constants'

const STEPS = ['拍照', '勺子打分', '风味标签', '补充信息']

const AI_FLAVOR_MAP = {
  '抹茶': '抹茶', '可可': '可可', '咖啡': '咖啡', '果味': '果味',
  '花香': '花香', '酒香': '酒香', '芝士': '芝士', '坚果': '坚果',
  '焦糖': '焦糖', '椰香': '椰香', '茶味': '茶味', '豆乳': '豆乳',
}
const AI_TEXTURE_MAP = {
  '绵密': '绵密', '轻盈': '轻盈', '酥脆': '酥脆', 'Q弹': 'Q弹',
  '拉丝': '拉丝', '流心': '流心', '冰沙': '冰沙', '松软': '松软',
}
// 饮品配料映射
const AI_TOPPINGS_MAP = {
  '珍珠': '珍珠', '椰果': '椰果', '布丁': '布丁', '芋泥': '芋泥',
  '西米露': '西米露', '仙草': '仙草', '脆波波': '脆波波',
}
const AI_TEMP_MAP = {
  '常温': '常温', '冷藏': '冷藏', '热食': '热食', '冰品': '冰品',
}

export default function RecordFlow({ records = [], navigateTo, goBack, loadRecords, checkAchievements, params }) {
  const [step, setStep] = useState(0)
  const [photo, setPhoto] = useState(null)
  const [rating, setRating] = useState(3.5)
  const [sweetness, setSweetness] = useState('适中')
  const [texture, setTexture] = useState([])
  const [flavor, setFlavor] = useState([])
  const [temperature, setTemperature] = useState('冷藏')
  const [itemName, setItemName] = useState('')
  const [shopName, setShopName] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [isHomemade, setIsHomemade] = useState(false)
  const [note, setNote] = useState('')
  const [customTexture, setCustomTexture] = useState('')
  const [customFlavor, setCustomFlavor] = useState('')
  const cameraRef = useRef(null)
  const albumRef = useRef(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [emojiIdx, setEmojiIdx] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [category, setCategory] = useState(params?.category || '甜品')
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 16))

  // 从历史记录中提取自定义风味/口感（不在预设列表中的）
  const PRESET_FLAVORS = ['抹茶', '可可', '咖啡', '果味', '花香', '酒香', '芝士', '坚果', '焦糖', '椰香', '茶味', '豆乳']
  const PRESET_TEXTURES = ['绵密', '轻盈', '酥脆', 'Q弹', '拉丝', '流心', '冰沙', '松软']
  const PRESET_TOPPINGS = ['珍珠', '椰果', '布丁', '芋泥', '西米露', '仙草', '脆波波']
  const PRESET_ICE_TEXTURES = ['绵密', '清爽', '沙沙', '浓郁', 'Q弹', '香甜', '冰爽', '爆浆']
  const HISTORIC_MAX = 15

  const historicFlavors = useMemo(() => {
    const allPreset = new Set(PRESET_FLAVORS)
    const counts = {}
    for (const r of records) {
      for (const f of r.flavor || []) {
        if (!allPreset.has(f)) counts[f] = (counts[f] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, HISTORIC_MAX)
      .map(([name]) => name)
  }, [records])

  const historicTextures = useMemo(() => {
    const allPreset = new Set([...PRESET_TEXTURES, ...PRESET_TOPPINGS, ...PRESET_ICE_TEXTURES])
    const counts = {}
    for (const r of records) {
      for (const t of r.texture || []) {
        if (!allPreset.has(t)) counts[t] = (counts[t] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, HISTORIC_MAX)
      .map(([name]) => name)
  }, [records])

  const recognizeDessert = async (imageDataUrl) => {
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        const r = data.data
        setAiError(null)
        setAiResult(r)
        // 预填分类
        if (r.category === '饮品' || r.category === '甜品' || r.category === '冰品') {
          setCategory(r.category)
        }
        // 预填甜度
        if (r.sweetness && SWEETNESS_OPTIONS.includes(r.sweetness)) {
          setSweetness(r.sweetness)
        }
        // 预填风味（只取我们支持的标签）
        if (r.flavor?.length) {
          const matched = r.flavor.filter(f => AI_FLAVOR_MAP[f])
          if (matched.length) setFlavor(matched)
        }
        // 预填口感/配料
        if (r.texture?.length) {
          const matched = r.texture.filter(t => AI_TEXTURE_MAP[t] || AI_TOPPINGS_MAP[t])
          if (matched.length) setTexture(matched)
        }
        // 预填温度
        if (r.temperature && AI_TEMP_MAP[r.temperature]) {
          setTemperature(r.temperature)
        }
      } else if (data.text) {
        setAiError(null)
        setAiResult({ type: '识别完成，请手动选择标签' })
      } else {
        setAiResult(null)
        setAiError('识别失败，到标签页可手动选择')
      }
    } catch (e) {
      setAiResult(null)
      setAiError('识别失败')
    } finally {
      setAiLoading(false)
    }
  }

  const DESSERT_EMOJIS = ['🍰', '🧋', '🍦', '🍮', '🧁', '🍪', '🥮', '🍩', '🍫', '🥧']

  // Animate emoji cycling
  useEffect(() => {
    if (step !== 1) return
    const timer = setInterval(() => {
      setEmojiIdx((prev) => (prev + 1) % DESSERT_EMOJIS.length)
    }, 800)
    return () => clearInterval(timer)
  }, [step])

  // 编辑模式：加载已有数据
  useEffect(() => {
    if (!params?.id) return
    getRecord(params.id).then((r) => {
      if (!r) return
      setPhoto(r.image_path || null)
      setRating(r.rating || 3.5)
      setCategory(r.category || '甜品')
      setItemName(r.name || '')
      setSweetness(r.sweetness || '适中')
      setTexture(r.texture || [])
      setFlavor(r.flavor || [])
      setTemperature(r.temperature || '冷藏')
      setShopName(r.shop_name || '')
      setLocation(r.location || '')
      setPrice(r.price ? String(r.price) : '')
      setIsHomemade(r.is_homemade || false)
      setNote(r.note || '')
    })
  }, [params?.id])

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAiLoading(true)
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const compressed = await compressImage(ev.target.result)
          // 存储到本地（base64 dataUrl）
          setPhoto(compressed)
          setStep(1)
          // AI 自动识别
          recognizeDessert(compressed)
        } catch (err) {
          console.error('图片处理失败:', err)
          setAiResult(null)
          setAiError('图片处理失败')
          setAiLoading(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleArray = (arr, setter, item) => {
    if (arr.includes(item)) {
      setter(arr.filter((x) => x !== item))
    } else {
      setter([...arr, item])
    }
  }

  const isEditing = !!params?.id

  const handleSubmit = async () => {
    try {
      const data = {
        image_path: photo,
        name: itemName,
        category,
        rating,
        sweetness,
        texture,
        flavor,
        temperature,
        shop_name: isHomemade ? '' : shopName,
        location: isHomemade ? '' : location,
        price: price ? Number(price) : null,
        note,
        is_homemade: isHomemade,
        created_at: photoDate ? new Date(photoDate).toISOString() : undefined,
      }
      if (isEditing) {
        await updateRecord(params.id, data)
      } else {
        await addRecord(data)
      }
    await loadRecords()
    if (!isEditing) checkAchievements()
    setFeedbackCount((prev) => prev + 1)
    setShowFeedback(true)
    setTimeout(() => {
      setShowFeedback(false)
      navigateTo('home')
    }, 2000)
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存失败，请重试: ' + e.message)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 mb-5">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === step
              ? 'w-7 h-2.5 bg-strawberry rounded-[5px]'
              : i < step
              ? 'w-2.5 h-2.5 bg-matcha'
              : 'w-2.5 h-2.5 bg-border'
          }`}
        />
      ))}
    </div>
  )

  // ── Step 0: Photo ──
  if (step === 0) {
    return (
      <div>
        <div className="nav-bar">
          <span className="text-base text-caramel cursor-pointer" onClick={goBack}>
            ✕ 取消
          </span>
          <span className="text-[17px] font-bold text-text-primary">{isEditing ? '更换照片' : '拍摄'}</span>
          <span className="text-xs text-text-muted">1/4</span>
        </div>
        <div className="px-5 pt-4">
          {renderStepIndicator()}

          {/* Camera area */}
          <div className="w-full aspect-square bg-gradient-to-br from-[#3C2415] to-[#5C3A25] rounded-lg flex items-center justify-center relative overflow-hidden">
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-white/50">
                <div className="text-5xl mb-2">🍰🧋🍦</div>
                <div className="text-sm">甜品 · 饮品 · 冰品拍照区</div>
              </div>
            )}
          </div>

          {/* Photo source buttons */}
          <div className="flex gap-3 mt-5">
            <button
              className="flex-1 py-4 rounded-pill bg-strawberry text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(232,113,109,0.3)]"
              onClick={() => cameraRef.current?.click()}
            >
              📷 拍照
            </button>
            <button
              className="flex-1 py-4 rounded-pill bg-white text-caramel text-sm font-semibold flex items-center justify-center gap-2 border-[1.5px] border-border"
              onClick={() => albumRef.current?.click()}
            >
              🖼️ 相册选择
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <input
            ref={albumRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoCapture}
          />
        </div>
      </div>
    )
  }

  // ── Step 1: Rating ──
  if (step === 1) {
    return (
      <div>
        <div className="nav-bar">
          <span className="text-base text-caramel cursor-pointer" onClick={() => setStep(0)}>
            ← 返回
          </span>
          <span className="text-xs text-text-muted">2/4</span>
        </div>
        <div className="px-5 pt-4">
          {renderStepIndicator()}

          {/* Rating plate */}
          <div className="text-center py-5">
            {/* Photo thumbnail */}
            {photo && (
              <div className="relative w-[120px] h-20 rounded-sm mx-auto mb-3 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)] group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs cursor-pointer"
                  onClick={() => { setStep(0); setPhoto(null); setAiLoading(false); setAiResult(null); setAiError(null) }}
                >
                  📷 重拍
                </button>
              </div>
            )}

            <div className="w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,#FFF8F0,#F0E0D0)] mx-auto mb-4 flex items-center justify-center text-5xl shadow-[0_8px_30px_rgba(139,94,60,0.1)] transition-all duration-300">
              <span className="inline-block animate-bounce" style={{ animationDuration: '0.6s' }} key={emojiIdx}>
                {DESSERT_EMOJIS[emojiIdx]}
              </span>
            </div>
            <div className="text-4xl font-bold text-caramel">{rating} 勺</div>
            <div className="text-sm text-text-secondary mt-2">
              {RATING_TEXTS[rating] || '还不错'}
            </div>

            {/* AI 识别状态 */}
            <div className="mt-4 h-6">
              {aiLoading && (
                <div className="text-xs text-matcha animate-pulse">
                  🤖 正在识别…
                </div>
              )}
              {aiResult && !aiLoading && (
                <div className="text-xs text-matcha">
                  🤖 已识别：{aiResult.type || aiResult.sweetness ? '识别成功' : ''}
                  {aiResult.type && <span className="text-caramel font-medium ml-1">{aiResult.type}</span>}
                </div>
              )}
              {aiError && !aiLoading && (
                <div className="text-xs text-strawberry">
                  🤖 识别失败，到标签页可手动选择
                </div>
              )}
            </div>

            {/* Slider */}
            <div className="mt-2 text-sm text-text-muted">← 拖动勺子调整 →</div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-4/5 mt-4 accent-strawberry"
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            <span />
            <button
              className="px-7 py-2.5 bg-caramel text-white rounded-pill text-sm font-medium"
              onClick={() => setStep(2)}
            >
              下一步 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Tags ──
  if (step === 2) {
    return (
      <div>
        <div className="nav-bar">
          <span className="text-base text-caramel cursor-pointer" onClick={() => setStep(1)}>
            ← 返回
          </span>
          <span className="text-xs text-text-muted">3/4</span>
        </div>
        <div className="px-5 pt-4">
          {renderStepIndicator()}

          {/* 分类切换 */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[
              { id: '甜品', emoji: '🍰', label: '甜品' },
              { id: '饮品', emoji: '🧋', label: '饮品' },
              { id: '冰品', emoji: '🍦', label: '冰品' },
            ].map((c) => (
              <span
                key={c.id}
                className={`px-4 py-2 rounded-pill text-sm font-medium transition-all cursor-pointer ${
                  category === c.id
                    ? 'bg-caramel text-white shadow-md'
                    : 'bg-card-bg text-text-secondary border border-border'
                }`}
                onClick={() => setCategory(c.id)}
              >
                {c.emoji} {c.label}
              </span>
            ))}
          </div>

          {/* AI 识别结果 */}
          {(aiResult || aiLoading || aiError) && (
            <div className="mb-3 px-3 py-2 rounded bg-matcha/5 border border-matcha/20 text-xs flex items-center gap-2">
              {aiLoading && <span className="text-matcha animate-pulse">🤖 AI 识别中…</span>}
              {aiResult && !aiLoading && (
                <span className="text-matcha">
                  🤖 AI 已识别
                  {aiResult.type && <span className="font-semibold ml-1">「{aiResult.type}」</span>}
                  ，标签已自动填入，可手动调整
                </span>
              )}
              {aiError && !aiLoading && (
                <>
                  <span className="text-strawberry">🤖 AI 识别失败</span>
                  <span className="text-caramel cursor-pointer ml-auto" onClick={() => recognizeDessert(photo)}>重试</span>
                </>
              )}
            </div>
          )}

          {/* 甜度 - 星星选择 */}
          <div className="mb-[18px]">
            <div className="text-[13px] font-semibold text-text-primary mb-2">甜度</div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((star) => (
                  <span
                    key={star}
                    className="text-2xl cursor-pointer transition-all duration-200 hover:scale-110"
                    onClick={() => setSweetness(SWEETNESS_OPTIONS[star - 1])}
                  >
                    {sweetness === SWEETNESS_OPTIONS[star - 1] ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
              <span className="text-sm text-caramel font-medium">{sweetness}</span>
            </div>
          </div>
          {/* 口感 / 配料 */}
          <div className="mb-[18px]">
            <div className="text-[13px] font-semibold text-text-primary mb-2">
              {category === '饮品' ? '配料 🧋' : category === '冰品' ? '口感 🍦' : '口感 😋'}
              <span className="font-normal text-text-muted ml-1">（可多选）</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(category === '饮品' ? [
                ['珍珠', '🖤'], ['椰果', '🥥'], ['布丁', '🍮'],
                ['芋泥', '💜'], ['西米露', '🤍'], ['仙草', '⬛'],
                ['脆波波', '🧊'],
              ] : category === '冰品' ? [
                ['绵密', '☁️'], ['清爽', '💧'], ['沙沙', '❄️'],
                ['浓郁', '🍫'], ['Q弹', '🫧'], ['香甜', '🍯'],
                ['冰爽', '🧊'], ['爆浆', '💥'],
              ] : [
                ['绵密', '☁️'], ['轻盈', '🪶'], ['酥脆', '🥐'],
                ['Q弹', '🫧'], ['拉丝', '🧀'], ['流心', '💛'],
                ['冰沙', '❄️'], ['松软', '🍞'],
              ]).map(([opt, emoji]) => (
                <span
                  key={opt}
                  className={`tag-pill ${texture.includes(opt) ? 'selected' : ''}`}
                  onClick={() => toggleArray(texture, setTexture, opt)}
                >
                  {emoji} {opt}
                </span>
              ))}
            </div>
            {historicTextures.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="text-[11px] text-text-muted self-center mr-0.5">📋 历史</span>
                {historicTextures.map((t) => (
                  <span key={t}
                    className={`text-xs px-2 py-0.5 rounded-pill border cursor-pointer transition-colors ${
                      texture.includes(t)
                        ? (category === '饮品' ? 'bg-strawberry/10 text-strawberry border-strawberry/30' : category === '冰品' ? 'bg-[#4A90D9]/10 text-[#4A90D9] border-[#4A90D9]/30' : 'bg-matcha/10 text-matcha border-matcha/30')
                        : 'bg-white border-border text-text-secondary hover:bg-butter/50'
                    }`}
                    onClick={() => {
                      if (texture.includes(t)) setTexture(texture.filter((x) => x !== t))
                      else setTexture([...texture, t])
                    }}
                  >
                    {texture.includes(t) ? '✓ ' : '+ '}{t}
                  </span>
                ))}
              </div>
            )}
            {/* 自定义 */}
            <div className="flex gap-2 mt-2">
              <input
                className="form-input flex-1 text-xs"
                placeholder={category === '饮品' ? '其他配料…' : category === '冰品' ? '其他口感…' : '其他口感…'}
                value={customTexture}
                onChange={(e) => setCustomTexture(e.target.value)}
              />
              <button
                className="px-3 py-2 bg-butter text-caramel rounded-pill text-xs font-medium"
                onClick={() => {
                  if (customTexture.trim() && !texture.includes(customTexture.trim())) {
                    setTexture([...texture, customTexture.trim()])
                    setCustomTexture('')
                  }
                }}
              >
                添加
              </button>
            </div>
            {texture.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {texture.map((t) => (
                  <span key={t} className={`text-xs px-2 py-0.5 rounded-pill flex items-center gap-1 ${category === '饮品' ? 'text-strawberry bg-strawberry/10' : category === '冰品' ? 'text-[#4A90D9] bg-[#4A90D9]/10' : 'text-matcha bg-matcha/10'}`}>
                    {t}
                    <span className="cursor-pointer" onClick={() => setTexture(texture.filter((x) => x !== t))}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 风味 - 可爱多选 */}
          <div className="mb-[18px]">
            <div className="text-[13px] font-semibold text-text-primary mb-2">
              风味 👅 <span className="font-normal text-text-muted ml-1">（可多选）</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['抹茶', '🍵'], ['可可', '🍫'], ['咖啡', '☕'],
                ['果味', '🍓'], ['花香', '🌸'], ['酒香', '🍷'],
                ['芝士', '🧀'], ['坚果', '🥜'], ['焦糖', '🍮'],
                ['椰香', '🥥'], ['茶味', '🫖'], ['豆乳', '🧋'],
              ].map(([opt, emoji]) => (
                <span
                  key={opt}
                  className={`tag-pill ${flavor.includes(opt) ? 'selected' : ''}`}
                  onClick={() => toggleArray(flavor, setFlavor, opt)}
                >
                  {emoji} {opt}
                </span>
              ))}
            </div>
            {historicFlavors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="text-[11px] text-text-muted self-center mr-0.5">📋 历史</span>
                {historicFlavors.map((f) => (
                  <span key={f}
                    className={`text-xs px-2 py-0.5 rounded-pill border cursor-pointer transition-colors ${
                      flavor.includes(f)
                        ? 'bg-strawberry/10 text-strawberry border-strawberry/30'
                        : 'bg-white border-border text-text-secondary hover:bg-butter/50'
                    }`}
                    onClick={() => {
                      if (flavor.includes(f)) setFlavor(flavor.filter((x) => x !== f))
                      else setFlavor([...flavor, f])
                    }}
                  >
                    {flavor.includes(f) ? '✓ ' : '+ '}{f}
                  </span>
                ))}
              </div>
            )}
            {/* 自定义风味 */}
            <div className="flex gap-2 mt-2">
              <input
                className="form-input flex-1 text-xs"
                placeholder="其他风味…"
                value={customFlavor}
                onChange={(e) => setCustomFlavor(e.target.value)}
              />
              <button
                className="px-3 py-2 bg-butter text-caramel rounded-pill text-xs font-medium"
                onClick={() => {
                  if (customFlavor.trim() && !flavor.includes(customFlavor.trim())) {
                    setFlavor([...flavor, customFlavor.trim()])
                    setCustomFlavor('')
                  }
                }}
              >
                添加
              </button>
            </div>
            {flavor.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {flavor.map((f) => (
                  <span key={f} className="text-xs text-strawberry bg-strawberry/10 px-2 py-0.5 rounded-pill flex items-center gap-1">
                    {f}
                    <span className="cursor-pointer" onClick={() => setFlavor(flavor.filter((x) => x !== f))}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 温度 - 带示例 */}
          <div className="mb-[18px]">
            <div className="text-[13px] font-semibold text-text-primary mb-2">温度 🌡️</div>
            <div className="flex flex-wrap gap-2">
              {[
                ['常温', '🌡️ 室温保存'],
                ['冷藏', '🧊 冰冰涼涼'],
                ['热食', '🔥 剛出爐'],
                ['冰品', '🍦 透心涼'],
              ].map(([opt, desc]) => (
                <span
                  key={opt}
                  className={`tag-pill ${temperature === opt ? 'selected' : ''}`}
                  onClick={() => setTemperature(opt)}
                >
                  {desc}
                </span>
              ))}
            </div>
          </div>

<div className="flex justify-end pt-4">
            <button
              className="px-7 py-2.5 bg-caramel text-white rounded-pill text-sm font-medium"
              onClick={() => setStep(3)}
            >
              下一步 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Details + Submit ──
  return (
    <div>
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={() => setStep(2)}>
          ← 返回
        </span>
        <span className="text-[17px] font-bold text-text-primary">{isEditing ? '编辑' : '补充信息'}</span>
        <span className="text-xs text-text-muted">4/4</span>
      </div>
      <div className="px-5 pt-4 pb-8">
        {renderStepIndicator()}

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">店名</div>
          <input
            className="form-input"
            placeholder="输入店铺名称"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            disabled={isHomemade}
          />
        </div>

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">
            {category === '饮品' ? '🧋 饮品名称' : category === '冰品' ? '🍦 冰品名称' : '🍰 甜品名称'} <span className="text-text-muted font-normal">（选填）</span>
          </div>
          <input
            className="form-input"
            placeholder={category === '饮品' ? 'eg. 波霸奶茶、抹茶拿铁…' : category === '冰品' ? 'eg. 抹茶冰淇淋、芒果冰沙…' : 'eg. 草莓蛋糕、提拉米苏…'}
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">地址（选填）</div>
          <input
            className="form-input text-caramel"
            placeholder="手动输入地址"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isHomemade}
          />
        </div>

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5 flex items-center gap-3">
            价格
            <span className="font-normal text-xs flex items-center gap-2.5">
              🏠 这是我做的
              <span
                className={`toggle-switch ${isHomemade ? 'on' : ''}`}
                onClick={() => setIsHomemade(!isHomemade)}
              />
            </span>
          </div>
          <input
            className="form-input"
            placeholder="¥"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            disabled={isHomemade}
          />
        </div>

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">备注（选填）</div>
          <textarea
            className="form-input h-14 resize-none"
            placeholder="一句话记录感受…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <div className="text-[13px] font-semibold text-text-primary mb-1.5">记录日期</div>
          <input
            type="datetime-local"
            className="form-input text-sm"
            value={photoDate}
            onChange={(e) => setPhotoDate(e.target.value)}
          />
        </div>

        <button className="btn-primary" onClick={handleSubmit}>
          {isEditing ? '✅ 更新记录' : '✨ 完成记录'}
        </button>

        {/* Feedback overlay */}
        {showFeedback && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            {/* Dessert confetti rain */}
            {['🍰','🧋','🍦','🍮','🧁','🍪','🍫','🍨','🍭','🍩'].map((emoji, i) => (
              <span
                key={i}
                className="absolute text-xl animate-confetti"
                style={{
                  left: `${8 + i * 9}%`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: `${1.2 + Math.random() * 0.8}s`,
                  fontSize: `${16 + Math.random() * 16}px`,
                }}
              >
                {emoji}
              </span>
            ))}
            <div className="anim-pop bg-caramel text-white px-10 py-5 rounded-lg text-lg font-semibold shadow-[0_8px_30px_rgba(139,94,60,0.3)]">
              🥄 第 {feedbackCount} 份已入册
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
