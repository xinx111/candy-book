const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const API_KEY = 'ab2e68cdf648ed77c9fc2aadda89d1fd.cDkoAOmatHqqh7Aq'
const PORT = 3001
const UPLOAD_DIR = path.join(__dirname, 'uploads')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 调用智谱 GLM
async function callGLM(messages) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.bigmodel.cn',
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch(e) { reject(new Error(data)) }
      })
    })
    req.on('error', reject)
    req.write(JSON.stringify({
      model: 'glm-4v-flash',
      messages
    }))
    req.end()
  })
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return
  }

  // 收集 body
  const getBody = () => new Promise((resolve) => {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => resolve(body))
  })

  // ── 图片上传 ──
  if (req.method === 'POST' && req.url === '/upload') {
    try {
      const { image } = JSON.parse(await getBody())
      if (!image || !image.startsWith('data:image')) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: '无效的图片数据' }))
        return
      }
      // 解析 base64 数据
      const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!matches) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: '图片格式错误' }))
        return
      }
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
      const buffer = Buffer.from(matches[2], 'base64')
      const filename = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, buffer)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, url: `/uploads/${filename}` }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: e.message }))
    }
    return
  }

  // ── 提供上传的图片文件 ──
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOAD_DIR, path.basename(req.url))
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).slice(1)
      const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
    return
  }

  // 甜品识别（图片+分析）
  if (req.method === 'POST' && req.url === '/recognize') {
    try {
      const { image } = JSON.parse(await getBody())
      const result = await callGLM([
        {
          role: 'user',
          content: [
            { type: 'text', text: '识别这张图片是不是甜品或饮品或冰淇淋冰品类照片。如果是冰淇淋/雪糕/冰品，category填"冰品"。用JSON格式返回结果，包含：category（分类：甜品/饮品/冰品），sweetness（甜度：无糖/微甜/适中/偏甜/很甜），flavor（风味数组，从[抹茶,可可,咖啡,果味,花香,酒香,芝士,坚果,焦糖,椰香,茶味,豆乳]中选最匹配的1-3个），texture（如果是甜品从[绵密,轻盈,酥脆,Q弹,拉丝,流心,冰沙,松软]选1-2个；如果是饮品从[珍珠,椰果,布丁,芋泥,西米露,仙草,脆波波]选1-2个；如果是冰品从[绵密,清爽,沙沙,浓郁,Q弹,香甜,冰爽,爆浆]选1-2个），temperature（温度：常温/冷藏/热食/冰品），type（具体名称，如奶茶/提拉米苏/抹茶冰淇淋）。只返回JSON，不要其他文字。' },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ])
      const content = result?.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, data: JSON.parse(jsonMatch[0]) }))
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, text: content }))
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: e.message }))
    }
    return
  }
  // 通用 AI 接口（搜索/报告/文案）
  if (req.method === 'POST' && req.url === '/ai') {
    try {
      const { prompt, image } = JSON.parse(await getBody())
      const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
      if (image) messages[0].content.push({ type: 'image_url', image_url: { url: image } })
      const result = await callGLM(messages)
      const content = result?.choices?.[0]?.message?.content || ''
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, text: content }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: e.message }))
    }
    return
  }
  res.writeHead(404)
  res.end('Not Found')
})
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Candy API proxy running on port ${PORT}`)
})
