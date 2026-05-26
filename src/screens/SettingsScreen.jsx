import { useState, useRef } from 'react'
import { getAllRecords, clearAll, importRecords } from '../data/store'

export default function SettingsScreen({ goBack, loadRecords }) {
  const [importMsg, setImportMsg] = useState('')
  const importRef = useRef(null)

  const handleExportJSON = async () => {
    const records = await getAllRecords()
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `糖记_备份_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportMarkdown = async () => {
    const records = await getAllRecords()
    let md = '# 🍰 糖记 · 甜品记录\n\n'
    let currentDate = ''
    for (const r of records) {
      const date = r.created_at.slice(0, 10)
      if (date !== currentDate) {
        currentDate = date
        md += `\n## ${date}\n\n`
      }
      md += `- ${r.flavor?.join('·') || '甜品'} · ${r.shop_name || (r.is_homemade ? '自制' : '未知店铺')} · 🥄${r.rating} 勺`
      if (r.price) md += ` · ¥${r.price}`
      if (r.note) md += `\n  > ${r.note}`
      md += '\n'
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `糖记_记录_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('')
    try {
      const text = await file.text()
      const records = JSON.parse(text)
      if (!Array.isArray(records) || records.length === 0) {
        setImportMsg('文件格式不对，请导入 JSON 格式的备份文件')
        return
      }
      const count = await importRecords(records)
      setImportMsg(`✅ 成功导入 ${count} 条记录`)
      await loadRecords()
    } catch (err) {
      setImportMsg('导入失败：' + err.message)
    }
    e.target.value = ''
    setTimeout(() => setImportMsg(''), 4000)
  }

  const handleDeleteAll = async () => {
    if (window.confirm('确定要删除所有记录吗？此操作不可恢复。')) {
      await clearAll()
      await loadRecords()
      goBack()
    }
  }

  return (
    <div>
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={goBack}>
          ← 手账
        </span>
        <span className="text-[17px] font-bold text-text-primary">设置</span>
      </div>

      {/* Data */}
      <div className="px-5 pt-1.5 pb-4">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.5px] pb-2">数据</div>
        <div className="flex justify-between items-center py-3.5 border-b border-border text-sm text-text-primary cursor-pointer" onClick={handleExportJSON}>
          导出所有记录 (JSON) <span className="text-text-muted">›</span>
        </div>
        <div className="flex justify-between items-center py-3.5 border-b border-border text-sm text-text-primary cursor-pointer" onClick={() => importRef.current?.click()}>
          导入记录 (JSON) <span className="text-text-muted">›</span>
        </div>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        {importMsg && <div className="text-xs text-matcha pt-2">{importMsg}</div>}
        <div className="flex justify-between items-center py-3.5 border-b border-border text-sm text-text-primary cursor-pointer" onClick={handleExportMarkdown}>
          导出为 Markdown <span className="text-text-muted">›</span>
        </div>
      </div>

      {/* About */}
      <div className="px-5 pt-5 text-center">
        <div className="text-sm text-caramel font-semibold">🍰 糖记 v1.0.0</div>
        <div className="text-xs text-text-muted mt-1">祝你每天都是甜甜的</div>
        <div className="text-[11px] text-text-muted mt-0.5">隐私：所有数据仅存储于你的设备</div>
        <div
          className="text-xs text-strawberry mt-6 cursor-pointer"
          onClick={handleDeleteAll}
        >
          删除所有数据
        </div>
      </div>
    </div>
  )
}
