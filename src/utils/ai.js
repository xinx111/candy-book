/**
 * 糖记 · AI 统一调用层
 * 封装智谱 GLM-4-Flash API，纯前端直调，无需后端
 */
import { ZHIPU_API_KEY, ZHIPU_API_URL, ZHIPU_MODEL } from '../config'
import { getSeasonByMonth } from '../data/literature'

export async function callAI(prompt, options = {}) {
  const { temperature = 0.3, maxTokens = 1024 } = options
  try {
    const res = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ZHIPU_API_KEY,
      },
      body: JSON.stringify({
        model: ZHIPU_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error('AI API 请求失败 (' + res.status + '): ' + errText)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
  } catch (e) {
    console.error('AI 调用失败:', e)
    throw e
  }
}

export async function aiSearch(query) {
  const prompt = '你是一个甜品记录的搜索助手。用户的查询是：' + query + '\n根据查询提取出搜索条件，只返回JSON格式，不要其他文字。\n{"q":"关键词","flavor":[],"texture":[],"category":"","rating_min":0,"shop":""}\n\n示例：查询"星巴克抹茶拿铁" 返回 {"q":"抹茶拿铁","flavor":["抹茶"],"texture":[],"category":"","rating_min":0,"shop":"星巴克"}\n示例：查询"好吃的冰的" 返回 {"q":"","flavor":[],"texture":["冰沙"],"category":"冰品","rating_min":4,"shop":""}'
  const text = await callAI(prompt, { temperature: 0.1 })
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('AI 返回格式异常')
  }
}

export async function aiSummary(records) {
  if (!records.length) return '\u8fd8\u6ca1\u6709\u8bb0\u5f55\uff0c\u5148\u53bb\u5403\u5757\u751c\u54c1\u5427 \ud83c\udf70'
  const total = records.length
  const avgRating = (records.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
  const topFlavors = Object.entries(
    records.reduce((acc, r) => { (r.flavor || []).forEach(function(f) { acc[f] = (acc[f] || 0) + 1 }); return acc }, {})
  ).sort(function(a, b) { return b[1] - a[1] }).slice(0, 3).map(function(n) { return n[0] + n[1] + '\u6b21' }).join('\u3001')
  const topShops = Object.entries(
    records.reduce(function(acc, r) { if (r.shop_name) acc[r.shop_name] = (acc[r.shop_name] || 0) + 1; return acc }, {})
  ).sort(function(a, b) { return b[1] - a[1] }).slice(0, 3).map(function(n) { return n[0] + '(' + n[1] + '\u6b21)' }).join('\u3001')
  const cats = Object.entries(
    records.reduce(function(acc, r) { var c = r.category || '\u751c\u54c1'; acc[c] = (acc[c] || 0) + 1; return acc }, {})
  ).map(function(kv) { return kv[0] + kv[1] + '\u5757' }).join('\u3001')
  const totalSpent = records
    .filter(function(r) { return r.price != null && !r.is_homemade })
    .reduce(function(s, r) { return s + Number(r.price) }, 0)

  var prompt = ''
  prompt += '\u4f60\u662f\u4e00\u4e2a\u751c\u54c1\u7231\u597d\u8005\u7684\u79c1\u4eba\u996e\u98df\u5206\u6790\u5e08\u3002\u6839\u636e\u4ee5\u4e0b\u6570\u636e\u751f\u6210\u4e00\u6bb5\u6709\u8da3\u3001\u6e29\u6696\u7684\u53e3\u5473\u62a5\u544a\uff08100\u5b57\u4ee5\u5185\uff0c\u8bed\u6c14\u50cf\u670b\u53cb\u804a\u5929\uff0c\u4e0d\u8981\u7528markdown\u683c\u5f0f\uff09\uff1a\n\n'
  prompt += '\u603b\u8bb0\u5f55\uff1a' + total + '\u5757\n'
  prompt += '\u5e73\u5747\u8bc4\u5206\uff1a\ud83e\udd44' + avgRating + '\n'
  prompt += '\u70ed\u95e8\u98ce\u5473\uff1a' + (topFlavors || '\u6682\u65e0') + '\n'
  prompt += '\u5e38\u53bb\u5e97\u94fa\uff1a' + (topShops || '\u6682\u65e0') + '\n'
  prompt += '\u5206\u7c7b\uff1a' + cats + '\n'
  prompt += '\u603b\u82b1\u8d39\uff1a\u00a5' + totalSpent + '\n\n'
  prompt += '\u5199\u4e00\u6bb5\u4e2d\u6587\u62a5\u544a\uff0c\u76f4\u63a5\u8f93\u51fa\u5185\u5bb9\uff0c\u4e0d\u8981\u524d\u7f00\u3002'

  try {
    return await callAI(prompt, { temperature: 0.7, maxTokens: 512 })
  } catch {
    return 'AI \u6682\u65f6\u79bb\u7ebf\uff0c\u7b49\u4f1a\u513f\u518d\u6765\u770b\u770b\u5427 \ud83e\udd16'
  }
}

export async function aiMatchQuote(records, allQuotes) {
  if (!records.length || !allQuotes.length) return null

  // 本地筛选：按品类 + 季节 + 风味缩小候选
  var eatenCategories = new Set()
  var eatenFlavors = new Set()
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    eatenCategories.add(r.category || '\u901a\u7528')
    if (r.flavor) {
      for (var j = 0; j < r.flavor.length; j++) {
        eatenFlavors.add(r.flavor[j])
      }
    }
  }
  var eatenFoods = new Set()
  var catList = ['\u751c\u54c1', '\u996e\u54c1', '\u51b0\u54c1']
  for (var ci = 0; ci < catList.length; ci++) {
    if (eatenCategories.has(catList[ci]) || catList[ci] === '\u751c\u54c1') {
      eatenFoods.add(catList[ci])
    }
  }

  var month = new Date().getMonth() + 1
  var season = getSeasonByMonth(month)

  var candidates = []
  for (var k = 0; k < allQuotes.length; k++) {
    var q = allQuotes[k]
    if (q.season !== season && q.season !== '\u901a\u7528') continue
    if (q.food !== '\u901a\u7528' && !eatenFoods.has(q.food)) {
      var tagMatch = false
      for (var t = 0; t < (q.tags || []).length; t++) {
        if (eatenFlavors.has(q.tags[t])) { tagMatch = true; break }
      }
      if (!tagMatch) continue
    }
    candidates.push(q)
  }

  if (candidates.length < 10) {
    candidates = []
    for (var m = 0; m < allQuotes.length; m++) {
      var q2 = allQuotes[m]
      if (q2.season === season || q2.season === '\u901a\u7528') {
        candidates.push(q2)
      }
    }
  }

  if (candidates.length > 25) {
    var shuffled = candidates.slice().sort(function() { return Math.random() - 0.5 })
    candidates = shuffled.slice(0, 25)
  }

  if (candidates.length === 0) return null

  var todayParts = []
  for (var n = 0; n < records.length; n++) {
    var parts = []
    if (records[n].name) parts.push(records[n].name)
    if (records[n].category) parts.push(records[n].category)
    if (records[n].flavor && records[n].flavor.length) parts.push(records[n].flavor.join('\u3001'))
    if (records[n].note) parts.push(records[n].note)
    var s = parts.join('\uff0c')
    if (s) todayParts.push(s)
  }
  var todayFood = todayParts.join('\uff1b')

  var listLines = []
  for (var p = 0; p < candidates.length; p++) {
    var q3 = candidates[p]
    var line = p + '. \u300c' + q3.text + '\u300d\u2014\u2014' + q3.author
    if (q3.work) line += '\u300a' + q3.work + '\u300b'
    listLines.push(line)
  }

  var prompt = '\u4eca\u5929\u7528\u6237\u5403\u4e86\uff1a' + todayFood + '\n\n\u8bf7\u5728\u4ee5\u4e0b\u6587\u5b66\u53e5\u5b50\u4e2d\u9009\u4e00\u6761\u6700\u5951\u5408\u7684\uff08\u8003\u8651\u98ce\u5473\u3001\u6c1b\u56f4\u3001\u5fc3\u60c5\uff09\u3002\u53ea\u8fd4\u56de\u5e8f\u53f7\uff0c\u4e0d\u8981\u5176\u4ed6\u6587\u5b57\uff1a\n\n' + listLines.join('\n')

  try {
    var text = await callAI(prompt, { temperature: 0.3, maxTokens: 64 })
    var idx = parseInt(text.trim(), 10)
    if (!isNaN(idx) && idx >= 0 && idx < candidates.length) {
      return candidates[idx]
    }
    return null
  } catch {
    return null
  }
}
