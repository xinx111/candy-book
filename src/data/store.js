/**
 * 本地数据存储层 (IndexedDB via idb)
 * dessert_record 单表，全部本地
 */
import { openDB } from 'idb'

const DB_NAME = 'tangji-db'
const DB_VERSION = 2
const STORE_NAME = 'desserts'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('created_at', 'created_at')
          store.createIndex('shop_name', 'shop_name')
          store.createIndex('rating', 'rating')
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// ── CRUD ──

export async function addRecord(record) {
  const db = await getDB()
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  await db.add(STORE_NAME, {
    id,
    image_path: record.image_path || null,
    name: record.name || '',
    category: record.category || '甜品',
    rating: record.rating || 3.0,
    sweetness: record.sweetness || '适中',
    texture: record.texture || [],
    flavor: record.flavor || [],
    temperature: record.temperature || '常温',
    shop_name: record.shop_name || '',
    location: record.location || '',
    price: record.price || null,
    note: record.note || '',
    is_homemade: record.is_homemade || false,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  return id
}

export async function updateRecord(id, updates) {
  const db = await getDB()
  const existing = await db.get(STORE_NAME, id)
  if (!existing) return false
  await db.put(STORE_NAME, {
    ...existing,
    ...updates,
    id,
    updated_at: new Date().toISOString(),
  })
  return true
}

export async function deleteRecord(id) {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getRecord(id) {
  const db = await getDB()
  return db.get(STORE_NAME, id)
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

export async function getRecordsByDateRange(from, to) {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE_NAME, 'created_at')
  return all
    .filter((r) => r.created_at >= from && r.created_at <= to)
    .reverse()
}

export async function getTotalCount() {
  const db = await getDB()
  return db.count(STORE_NAME)
}

export async function clearAll() {
  const db = await getDB()
  await db.clear(STORE_NAME)
}

export async function importRecords(records) {
  const db = await getDB()
  let imported = 0
  for (const r of records) {
    // 生成新 ID 避免冲突
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    try {
      await db.add(STORE_NAME, {
        id,
        image_path: r.image_path || null,
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
      imported++
    } catch (e) {
      console.error('导入失败:', e)
    }
  }
  return imported
}

// ── Aggregation helpers ──

export function groupByDate(records) {
  const groups = new Map()
  for (const r of records) {
    const date = r.created_at.slice(0, 10) // YYYY-MM-DD
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
  // 获取本周一
  const dayOfWeek = now.getDay() || 7 // 1=Mon ... 7=Sun
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

  // 每日分布
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const dailyCount = weekDays.map((_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const dateStr = day.toISOString().slice(0, 10)
    const count = weekRecords.filter((r) => r.created_at.slice(0, 10) === dateStr).length
    return { label: weekDays[i], count, date: dateStr }
  })

  // 本周最受欢迎风味
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
