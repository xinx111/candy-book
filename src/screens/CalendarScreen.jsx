import { useState } from 'react'

export default function CalendarScreen({ records, navigateTo }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState(today.getDate())

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay() || 7 // Mon=1..Sun=7

  // Days with records
  const recordDates = new Set(records.map((r) => r.created_at.slice(0, 10)))
  const highScoreDates = new Set(
    records.filter((r) => r.rating >= 4.5).map((r) => r.created_at.slice(0, 10))
  )

  const selectedDateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
  const dayRecords = records.filter((r) => r.created_at.slice(0, 10) === selectedDateStr)
  const avgRating = dayRecords.length > 0
    ? (dayRecords.reduce((s, r) => s + r.rating, 0) / dayRecords.length).toFixed(1)
    : '0'

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
    setSelectedDay(1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
    setSelectedDay(1)
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  let cells = []
  let day = 1
  for (let w = 0; w < 6; w++) {
    let row = []
    for (let d = 0; d < 7; d++) {
      if ((w === 0 && d < firstDayOfWeek - 1) || day > daysInMonth) {
        row.push(null)
      } else {
        row.push(day)
        day++
      }
    }
    cells.push(row)
    if (day > daysInMonth) break
  }

  return (
    <div>
      <div className="nav-bar">
        <span className="text-base text-caramel cursor-pointer" onClick={() => navigateTo('home')}>
          ← 返回
        </span>
        <span className="flex items-center gap-2">
          <span className="text-text-muted text-sm cursor-pointer" onClick={prevMonth}>‹</span>
          <span className="text-[17px] font-bold text-text-primary">{viewYear}年{viewMonth}月</span>
          <span className="text-text-muted text-sm cursor-pointer" onClick={nextMonth}>›</span>
        </span>
        <span
          className="text-[13px] font-medium text-caramel cursor-pointer"
          onClick={() => navigateTo('home')}
        >
          列表 →
        </span>
      </div>

      {/* Calendar grid */}
      <div className="px-5">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="text-text-muted text-xs">
              {weekDays.map((d) => (
                <td key={d} className="py-2">{d}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, wi) => (
              <tr key={wi}>
                {row.map((cell, di) => {
                  if (!cell) return <td key={di} className="py-2.5 text-text-muted text-sm" />
                  const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(cell).padStart(2, '0')}`
                  const isToday = cell === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear()
                  const hasRecord = recordDates.has(dateStr)
                  const isHighScore = highScoreDates.has(dateStr)
                  const isSelected = cell === selectedDay

                  return (
                    <td
                      key={di}
                      className="py-1.5 text-sm relative cursor-pointer"
                      style={{ fontWeight: isToday ? 700 : 400 }}
                      onClick={() => setSelectedDay(cell)}
                    >
                      {isToday ? (
                        <span className="inline-block w-8 h-8 leading-8 bg-caramel text-white rounded-full">{cell}</span>
                      ) : isSelected ? (
                        <span className="inline-block w-8 h-8 leading-8 border-2 border-caramel rounded-full text-caramel">{cell}</span>
                      ) : cell}
                      {hasRecord && (
                        <span
                          className="block mx-auto mt-0.5 rounded-full"
                          style={{
                            width: isHighScore ? '8px' : '5px',
                            height: isHighScore ? '8px' : '5px',
                            background: isHighScore ? 'var(--tw-bg-strawberry, #E8716D)' : 'var(--tw-bg-caramel, #8B5E3C)',
                          }}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected day summary */}
      <div className="mx-5 mt-5 p-4 bg-white rounded shadow-card">
        <div className="text-[13px] text-text-muted mb-2">
          ── 选中 {viewMonth}月{selectedDay}日 ──
        </div>
        <div className="text-sm text-text-primary">
          当天吃了 <strong>{dayRecords.length}</strong> 块 · 平均 <strong>🥄{avgRating}</strong>
        </div>
        {dayRecords.length > 0 && (
          <div className="flex gap-1.5 mt-2.5">
            {dayRecords.slice(0, 4).map((r, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#F0D0D0] to-[#E8C0C0] flex items-center justify-center text-lg"
              >
                🍰
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
