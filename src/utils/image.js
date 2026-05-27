/**
 * 图片压缩工具 - 浏览器端 Canvas 压缩
 * @param {string} dataUrl - 原始图片 data URL
 * @param {number} maxWidth - 最大宽度（默认 600）
 * @param {number} quality - JPEG 质量 0-1（默认 0.65）
 */
export function compressImage(dataUrl, maxWidth = 600, quality = 0.65) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}
