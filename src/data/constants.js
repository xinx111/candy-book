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

export const ACHIEVEMENTS = [
  { id: 'cake_new', emoji: '🍰', name: '蛋糕新人', desc: '记录 10 块蛋糕', check: (r) => r.length >= 10 },
  { id: 'cake_master', emoji: '🧁', name: '蛋糕达人', desc: '记录 50 块蛋糕', check: (r) => r.length >= 50 },
  { id: 'cake_king', emoji: '👑', name: '蛋糕之王', desc: '记录 200 块蛋糕', check: (r) => r.length >= 200 },
  {
    id: 'ice_hunter', emoji: '🍦', name: '冰淇淋猎人',
    desc: '记录 20 种冰淇淋',
    check: (r) => r.filter((x) => x.category === '冰品').length >= 20,
  },
  { id: 'traveler', emoji: '🌏', name: '甜品旅行家', desc: '在 5 个城市吃过甜品', check: (r) => new Set(r.filter((x) => x.location).map((x) => x.location.split('市')[0] || x.location)).size >= 5 },
  {
    id: 'baker', emoji: '🏠', name: '烘焙学徒',
    desc: '自制 5 次', check: (r) => r.filter((x) => x.is_homemade).length >= 5,
  },
  {
    id: 'head_baker', emoji: '👨‍🍳', name: '家庭甜品师',
    desc: '自制 30 次', check: (r) => r.filter((x) => x.is_homemade).length >= 30,
  },
  {
    id: 'photographer', emoji: '📸', name: '甜品摄影师',
    desc: '记录 100 块', check: (r) => r.length >= 100,
  },
  {
    id: 'streak', emoji: '🔥', name: '甜蜜连击',
    desc: '连续 7 天有记录',
    check: (r) => {
      if (!r.length) return false
      const dates = [...new Set(r.map((x) => x.created_at.slice(0, 10)))].sort().reverse()
      let streak = 1
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1])
        const curr = new Date(dates[i])
        if ((prev - curr) / 86400000 === 1) streak++
        else break
      }
      return streak >= 7
    },
  },
  {
    id: 'night_owl', emoji: '🌙', name: '深夜甜食',
    desc: '23:00 后记录 10 次', check: (r) => r.filter((x) => new Date(x.created_at).getHours() >= 23).length >= 10,
  },
  {
    id: 'investor', emoji: '💸', name: '甜品投资人',
    desc: '单块花费超 ¥200', check: (r) => r.some((x) => Number(x.price) >= 200),
  },
  {
    id: 'birthday', emoji: '🎂', name: '生日蛋糕',
    desc: '生日当天有记录',
    check: (r) => {
      // Simple check: any record on a date that looks like birthday
      const today = new Date()
      const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      return r.some((x) => x.created_at.slice(5, 10) === mmdd)
    },
  },
]
