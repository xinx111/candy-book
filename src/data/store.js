/**
 * 本地数据存储层 (IndexedDB via idb)
 * desserts 表 - 文字数据
 * images 表 - 图片数据（懒加载）
 */
import { openDB } from 'idb'
import { compressImage } from '../utils/image'

const DB_NAME = 'tangji-db'
const DB_VERSION = 2
const STORE_NAME = 'desserts'
const IMAGE_STORE = 'images'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // desserts 表
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('created_at', 'created_at')
          store.createIndex('shop_name', 'shop_name')
          store.createIndex('rating', 'rating')
        }
        // images 表（v2 新增）
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// ── 图片工具：生成 400px 缩略图 ──
async function createThumb(fullDataUrl) {
  if (!fullDataUrl) return null
  try {
    return await compressImage(fullDataUrl, 400, 0.6)
  } catch {
    return fullDataUrl
  }
}

// ── 保存图片到独立表 ──
async function saveImage(id, imagePath) {
  if (!imagePath) return
  const db = await getDB()
  const thumb = await createThumb(imagePath)
  await db.put(IMAGE_STORE, { id, full: imagePath, thumb })
}

// ── CRUD ──

export async function addRecord(record) {
  const db = await getDB()
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const { image_path, ...textData } = record
  await db.add(STORE_NAME, {
    id,
    has_image: !!image_path,
    name: textData.name || '',
    category: textData.category || '甜品',
    rating: textData.rating || 3.0,
    sweetness: textData.sweetness || '适中',
    texture: textData.texture || [],
    flavor: textData.flavor || [],
    temperature: textData.temperature || '常温',
    shop_name: textData.shop_name || '',
    location: textData.location || '',
    price: textData.price || null,
    note: textData.note || '',
    is_homemade: textData.is_homemade || false,
    created_at: textData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (image_path) await saveImage(id, image_path)
  return id
}

export async function updateRecord(id, updates) {
  const db = await getDB()
  const existing = await db.get(STORE_NAME, id)
  if (!existing) return false
  const { image_path, ...textUpdates } = updates
  await db.put(STORE_NAME, {
    ...existing,
    ...textUpdates,
    has_image: image_path ? true : (existing.has_image || false),
    id,
    updated_at: new Date().toISOString(),
  })
  if (image_path) await saveImage(id, image_path)
  return true
}

export async function deleteRecord(id) {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
  await db.delete(IMAGE_STORE, id)
}

export async function getRecord(id) {
  const db = await getDB()
  const record = await db.get(STORE_NAME, id)
  if (!record) return null
  // 详情页需要 image_path，从 images 表取
  const img = await db.get(IMAGE_STORE, id)
  return { ...record, image_path: img?.full || null }
}

export async function getAllRecords() {
  const db = await getDB()
  const records = await db.getAllFromIndex(STORE_NAME, 'created_at')
  return records.reverse() // newest first
}

export async function getRecordsByShop(shopName) {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE_NAME, 'shop_name')
  return all.filter((r) => r.shop_name === shopName).reverse()
}

export async function getRecordDetail(id) {
  const db = await getDB()
  const record = await db.get(STORE_NAME, id)
  if (!record) return null
  const img = await db.get(IMAGE_STORE, id)
  return { ...record, image_path: img?.full || null }
}

/** 获取缩略图（给列表用） */
export async function getRecordThumb(id) {
  const db = await getDB()
  const img = await db.get(IMAGE_STORE, id)
  return img?.thumb || null
}

/** 获取原图（给详情用） */
export async function getRecordFullImage(id) {
  const db = await getDB()
  const img = await db.get(IMAGE_STORE, id)
  return img?.full || null
}

export async function getTotalCount() {
  const db = await getDB()
  return db.count(STORE_NAME)
}

export async function clearAll() {
  const db = await getDB()
  await db.clear(STORE_NAME)
  await db.clear(IMAGE_STORE)
}

export async function importRecords(records) {
  const db = await getDB()
  let imported = 0
  for (const r of records) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    try {
      await db.add(STORE_NAME, {
        id,
        has_image: !!r.image_path,
        name: r.name || '',
        category: r.category || '甜品',
        rating: r.rating ?? 3.0,
        sweetness: r.sweetness || '适中',
        texture: r.texture || [],
        flavor: r.flavor || [],
        temperature: r.temperature || '常温',
        shop_name: r.shop_name || '',
        location: r.location || '',
        price: r.price != null ? r.price : null,
        note: r.note || '',
        is_homemade: r.is_homemade || false,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      if (r.image_path) await saveImage(id, r.image_path)
      imported++
    } catch (e) {
      console.error('导入失败:', e)
    }
  }
  return imported
}

// ── 一次性迁移：把旧版 image_path 搬到 images 表 ──
export async function migrateImages(onProgress) {
  const db = await getDB()
  const records = await db.getAll(STORE_NAME)
  let migrated = 0
  let skipped = 0
  for (const r of records) {
    if (!r.image_path) { skipped++; continue }
    if (r.has_image) { skipped++; continue }
    // 生成缩略图
    const thumb = await createThumb(r.image_path)
    await db.put(IMAGE_STORE, { id: r.id, full: r.image_path, thumb })
    // 更新记录：清掉 image_path，改为 has_image 标记
    const { image_path, ...rest } = r
    await db.put(STORE_NAME, { ...rest, has_image: true, updated_at: new Date().toISOString() })
    migrated++
    if (onProgress) onProgress(migrated, records.length)
  }
  return { migrated, total: records.length }
}

// ── 聚合函数（不变）──

export function groupByDate(records) {
  const groups = new Map()
  for (const r of records) {
    const date = r.created_at.slice(0, 10)
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date).push(r)
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

export function groupByShop(records) {
  const groups = new Map()
  for (const r of records) {
    if (!r.shop_name) continue
    if (!groups.has(r.shop_name)) groups.set(r.shop_name, [])
    groups.get(r.shop_name).push(r)
  }
  return Array.from(groups.entries())
    .map(([name, recs]) => ({
      name,
      count: recs.length,
      avgRating: (recs.reduce((s, r) => s + r.rating, 0) / recs.length).toFixed(1),
      records: recs,
    }))
    .sort((a, b) => b.count - a.count)
}

export function getMonthlyStats(records) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthRecords = records.filter((r) => r.created_at >= monthStart)
  const totalSpent = records
    .filter((r) => r.price != null && !r.is_homemade)
    .reduce((s, r) => s + Number(r.price), 0)
  const monthSpent = monthRecords
    .filter((r) => r.price != null && !r.is_homemade)
    .reduce((s, r) => s + Number(r.price), 0)
  return {
    totalCount: records.length,
    monthCount: monthRecords.length,
    totalSpent,
    monthSpent,
    avgRating: records.length > 0
      ? (records.reduce((s, r) => s + r.rating, 0) / records.length).toFixed(1)
      : '0',
  }
}

export function getWeeklySummary(records) {
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  const weekRecords = records.filter((r) => {
    const d = new Date(r.created_at)
    return d >= monday && d <= sunday
  })
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const dailyCount = weekDays.map((_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const dateStr = day.toISOString().slice(0, 10)
    const count = weekRecords.filter((r) => r.created_at.slice(0, 10) === dateStr).length
    return { label: weekDays[i], count, date: dateStr }
  })
  const flavorCounts = {}
  for (const r of weekRecords) {
    for (const f of r.flavor || []) {
      flavorCounts[f] = (flavorCounts[f] || 0) + 1
    }
  }
  const topFlavor = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1])[0]
  return {
    totalCount: weekRecords.length,
    avgRating: weekRecords.length > 0
      ? (weekRecords.reduce((s, r) => s + r.rating, 0) / weekRecords.length).toFixed(1)
      : '0',
    totalSpent: weekRecords
      .filter((r) => r.price != null && !r.is_homemade)
      .reduce((s, r) => s + Number(r.price), 0),
    topFlavor: topFlavor ? topFlavor[0] : null,
    dailyCount,
    dateRange: `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`,
  }
}
