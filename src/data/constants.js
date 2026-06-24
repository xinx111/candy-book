/**
 * 常量定义：标签选项、成就条件、评分文案
 */

export const SWEETNESS_OPTIONS = ['微甜', '适中', '浓郁', '齁甜']

export const TEXTURE_OPTIONS = [
  '绵密', '轻盈', '酥脆', 'Q弹', '拉丝', '流心', '冰沙', '松软',
]

export const FLAVOR_OPTIONS = [
  '抹茶', '可可', '咖啡', '果味', '花香', '酒香', '芝士', '坚果',
  '焦糖', '椰香', '茶味', '豆乳',
]

export const TEMPERATURE_OPTIONS = ['常温', '冷藏', '热食', '冰品']

export const RATING_TEXTS = {
  0.5: '就尝了一小口',
  1.0: '就尝了一小口',
  1.5: '还可以',
  2.0: '还可以',
  2.5: '还行吧',
  3.0: '还行吧',
  3.5: '好吃的！',
  4.0: '非常好吃！',
  4.5: '非常好吃！',
  5.0: '此物只应天上有',
}

/** 计算历史最长连续记录天数 */
function getMaxStreak(records) {
  if (!records.length) return 0
  const dates = [...new Set(records.map((x) => x.created_at.slice(0, 10)))].sort()
  let maxStreak = 1
  let current = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
    if (diff === 1) {
      current++
      if (current > maxStreak) maxStreak = current
    } else {
      current = 1
    }
  }
  return maxStreak
}

export const ACHIEVEMENTS = [
  {
    id: 'cake_new', emoji: '🍰', name: '蛋糕新人', desc: '记录 10 块蛋糕',
    difficulty: 10,
    check: (r) => r.length >= 10,
    progress: (r) => ({ current: r.length, max: 10 }),
  },
  {
    id: 'cake_master', emoji: '🧁', name: '蛋糕达人', desc: '记录 50 块蛋糕',
    difficulty: 50,
    check: (r) => r.length >= 50,
    progress: (r) => ({ current: r.length, max: 50 }),
  },
  {
    id: 'cake_king', emoji: '👑', name: '蛋糕之王', desc: '记录 200 块蛋糕',
    difficulty: 200,
    check: (r) => r.length >= 200,
    progress: (r) => ({ current: r.length, max: 200 }),
  },
  {
    id: 'ice_hunter', emoji: '🍦', name: '冰淇淋猎人', desc: '记录 20 种冰品',
    difficulty: 30,
    check: (r) => r.filter((x) => x.category === '冰品').length >= 20,
    progress: (r) => ({ current: r.filter((x) => x.category === '冰品').length, max: 20 }),
  },
  {
    id: 'traveler', emoji: '🌏', name: '甜品旅行家', desc: '在 5 个城市吃过甜品',
    difficulty: 25,
    check: (r) => new Set(r.filter((x) => x.location).map((x) => x.location.split('市')[0] || x.location)).size >= 5,
    progress: (r) => ({ current: new Set(r.filter((x) => x.location).map((x) => x.location.split('市')[0] || x.location)).size, max: 5 }),
  },
  {
    id: 'baker', emoji: '🏠', name: '烘焙学徒', desc: '自制 5 次',
    difficulty: 15,
    check: (r) => r.filter((x) => x.is_homemade).length >= 5,
    progress: (r) => ({ current: r.filter((x) => x.is_homemade).length, max: 5 }),
  },
  {
    id: 'head_baker', emoji: '👨‍🍳', name: '家庭甜品师', desc: '自制 30 次',
    difficulty: 60,
    check: (r) => r.filter((x) => x.is_homemade).length >= 30,
    progress: (r) => ({ current: r.filter((x) => x.is_homemade).length, max: 30 }),
  },
  {
    id: 'photographer', emoji: '📸', name: '甜品摄影师', desc: '记录 100 块',
    difficulty: 100,
    check: (r) => r.length >= 100,
    progress: (r) => ({ current: r.length, max: 100 }),
  },
  {
    id: 'streak', emoji: '🔥', name: '甜蜜连击', desc: '连续 7 天有记录',
    difficulty: 35,
    check: (r) => getMaxStreak(r) >= 7,
    progress: (r) => ({ current: getMaxStreak(r), max: 7 }),
  },
  {
    id: 'night_owl', emoji: '🌙', name: '深夜甜食', desc: '23:00 后记录 10 次',
    difficulty: 20,
    check: (r) => r.filter((x) => new Date(x.created_at).getHours() >= 23).length >= 10,
    progress: (r) => ({ current: r.filter((x) => new Date(x.created_at).getHours() >= 23).length, max: 10 }),
  },
  {
    id: 'investor', emoji: '💸', name: '甜品投资人', desc: '单块花费超 ¥200',
    difficulty: 20,
    check: (r) => r.some((x) => Number(x.price) >= 200),
  },
  {
    id: 'birthday', emoji: '🎂', name: '生日蛋糕', desc: '生日当天有记录',
    difficulty: 15,
    check: (r) => {
      const birthday = localStorage.getItem('tangji-birthday')
      if (!birthday) return false
      var today = new Date()
      var mm = today.getMonth() + 1
      var dd = today.getDate()
      var todayStr = (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd
      var bdMmdd = birthday.slice(5)
      return todayStr === bdMmdd && r.some(function(x) { return x.created_at.slice(0, 10) === birthday })
    },
  },
]
