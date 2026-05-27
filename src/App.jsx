import { useState, useEffect, useCallback } from 'react'
import { getAllRecords, getRecord, migrateImages } from './data/store'
import TabBar from './components/TabBar'
import StatusBar from './components/StatusBar'
import HomeScreen from './screens/HomeScreen'
import CalendarScreen from './screens/CalendarScreen'
import StatsScreen from './screens/StatsScreen'
import WeeklyReportScreen from './screens/WeeklyReportScreen'
import ShopDetailScreen from './screens/ShopDetailScreen'
import RecordFlow from './screens/RecordFlow'
import DetailScreen from './screens/DetailScreen'
import WishlistScreen from './screens/WishlistScreen'
import ProfileScreen from './screens/ProfileScreen'
import SettingsScreen from './screens/SettingsScreen'
import AchievementModal from './components/AchievementModal'
import { ACHIEVEMENTS } from './data/constants'

const SCREENS_WITH_TABS = ['home', 'calendar', 'stats', 'wishlist', 'empty', 'profile']

export default function App() {
  const [screen, setScreen] = useState('home')
  const [screenParams, setScreenParams] = useState({})
  const [history, setHistory] = useState([])
  const [records, setRecords] = useState([])
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set())
  const [newAchievement, setNewAchievement] = useState(null)
  const [showAchievement, setShowAchievement] = useState(false)

  const loadRecords = useCallback(async () => {
    try {
      const all = await getAllRecords()
      setRecords(all)
    } catch (e) {
      console.error('Failed to load records:', e)
      setRecords([])
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // 一次性迁移：将旧版 image_path 搬到独立的 images 表
  useEffect(() => {
    const run = async () => {
      const migrationKey = 'tangji-migrated-v2'
      if (localStorage.getItem(migrationKey)) return
      const result = await migrateImages((done, total) => {
        console.log(`迁移进度: ${done}/${total}`)
      })
      console.log(`迁移完成: ${result.migrated} 张图片已迁移`)
      localStorage.setItem(migrationKey, '1')
      // 迁移后重新加载，此时 image_path 已清掉，records 变轻量
      loadRecords()
    }
    run()
  }, [loadRecords])

  const navigateTo = (name, params = {}) => {
    setHistory((prev) => [...prev, { name: screen, params: screenParams }])
    setScreen(name)
    setScreenParams(params)
  }

  const goBack = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setScreen(last.name)
      setScreenParams(last.params)
      return prev.slice(0, -1)
    })
  }

  const checkAchievements = useCallback(
    (currentRecords) => {
      const recs = currentRecords || records
      const newlyUnlocked = ACHIEVEMENTS.filter(
        (a) => !unlockedAchievements.has(a.id) && a.check(recs)
      )
      if (newlyUnlocked.length > 0) {
        setNewAchievement(newlyUnlocked[0])
        setShowAchievement(true)
        setUnlockedAchievements((prev) => {
          const next = new Set(prev)
          newlyUnlocked.forEach((a) => next.add(a.id))
          return next
        })
      }
    },
    [records, unlockedAchievements]
  )

  const showTabs = SCREENS_WITH_TABS.includes(screen)

  const renderScreen = () => {
    const props = {
      records,
      navigateTo,
      goBack,
      loadRecords,
      checkAchievements,
      params: screenParams,
    }
    switch (screen) {
      case 'home':
        return <HomeScreen {...props} />
      case 'calendar':
        return <CalendarScreen {...props} />
      case 'stats':
        return <StatsScreen {...props} />
      case 'record':
        return <RecordFlow {...props} />
      case 'detail':
        return <DetailScreen {...props} />
      case 'wishlist':
        return <WishlistScreen {...props} />
      case 'profile':
        return <ProfileScreen {...props} />
      case 'settings':
        return <SettingsScreen {...props} />
case 'weekly-report':
        return <WeeklyReportScreen {...props} />
      case 'shop-detail':
        return <ShopDetailScreen {...props} />
      case 'empty':
        return <HomeScreen {...props} isEmpty />
      default:
        return <HomeScreen {...props} />
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF0F0] p-5">
      <div className="phone-frame">
        <StatusBar />
        <div
          className={`overflow-y-auto overflow-x-hidden scroll-hide ${
            showTabs ? 'h-[calc(844px-44px-64px)]' : 'h-[calc(844px-44px)]'
          }`}
        >
          {renderScreen()}
        </div>
        {showTabs && (
          <TabBar
            active={screen === 'calendar' ? 'home' : screen}
            onTab={(tab) => {
              setHistory([])
              setScreen(tab)
              setScreenParams({})
            }}
          />
        )}
        {showAchievement && newAchievement && (
          <AchievementModal
            achievement={newAchievement}
            onClose={() => setShowAchievement(false)}
          />
        )}
      </div>
    </div>
  )
}
