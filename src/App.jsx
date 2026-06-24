import { useState, useEffect, useCallback } from 'react'
import { getAllRecords, getRecord } from './data/store'
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
import ErrorBoundary from './components/ErrorBoundary'
import { ACHIEVEMENTS } from './data/constants'

const SCREENS_WITH_TABS = ['home', 'calendar', 'stats', 'wishlist', 'empty', 'profile']

export default function App() {
  const [screen, setScreen] = useState('home')
  const [screenParams, setScreenParams] = useState({})
  const [history, setHistory] = useState([])
  const [records, setRecords] = useState([])
  const [unlockedAchievements, setUnlockedAchievements] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('tangji-achievements') || '[]')) } catch { return new Set() }
  })
  const [newAchievement, setNewAchievement] = useState(null)
  const [showAchievement, setShowAchievement] = useState(false)
  const [achievementQueue, setAchievementQueue] = useState([])

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
        // 按难度从高到低排序（先展示最难达成的）
        const sorted = [...newlyUnlocked].sort((a, b) => b.difficulty - a.difficulty)
        setUnlockedAchievements((prev) => {
          const next = new Set(prev)
          sorted.forEach((a) => next.add(a.id))
          localStorage.setItem('tangji-achievements', JSON.stringify([...next]))
          return next
        })
        setAchievementQueue(sorted.map((a) => a.id))
        setNewAchievement(sorted[0])
        setShowAchievement(true)
      }
    },
    [records, unlockedAchievements]
  )

  const closeAchievement = () => {
    const remaining = achievementQueue.slice(1)
    if (remaining.length > 0) {
      setAchievementQueue(remaining)
      setNewAchievement(ACHIEVEMENTS.find((a) => a.id === remaining[0]))
      // showAchievement 保持 true，不断弹出下一个
    } else {
      setShowAchievement(false)
      setNewAchievement(null)
      setAchievementQueue([])
    }
  }

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
    <div className="min-h-dvh bg-[#FFF0F0]">
      <div className="phone-frame">
        <StatusBar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-hide">
          <ErrorBoundary>{renderScreen()}</ErrorBoundary>
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
            onClose={closeAchievement}
            remaining={achievementQueue.length - 1}
          />
        )}
      </div>
    </div>
  )
}
