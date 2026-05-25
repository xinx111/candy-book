export default function TabBar({ active, onTab }) {
  const tabs = [
    { id: 'home', icon: '📖', label: '手账' },
    { id: 'stats', icon: '📊', label: '统计' },
    { id: 'profile', icon: '👤', label: '我的' },
  ]

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-item ${active === tab.id ? 'active' : ''}`}
          onClick={() => onTab(tab.id)}
        >
          <span className="text-[22px]">{tab.icon}</span>
          {tab.label}
        </div>
      ))}
    </div>
  )
}
