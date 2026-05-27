/**
 * 图片压缩工具 - 浏览器端 Canvas 压缩
 */

const MAX_WIDTH = 600
const QUALITY = 0.65

export function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 计算缩放比例
      const ratio = Math.min(MAX_WIDTH / img.width, MAX_WIDTH / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }
    img.src = dataUrl
  })
}
