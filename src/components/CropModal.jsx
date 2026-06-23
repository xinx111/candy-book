import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

export default function CropModal({ image, onCropDone, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    const canvas = document.createElement('canvas')
    const imageEl = new Image()
    imageEl.src = image
    await new Promise((r) => { imageEl.onload = r })

    const { width, height, x, y } = croppedAreaPixels
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(imageEl, x, y, width, height, 0, 0, width, height)

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
    onCropDone(croppedDataUrl)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm cursor-pointer" onClick={onCancel}>取消</span>
        <span className="text-sm font-medium">裁剪图片</span>
        <span className="text-sm font-semibold text-strawberry cursor-pointer" onClick={handleConfirm}>确认</span>
      </div>

      {/* 裁剪区域 */}
      <div className="flex-1 relative">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* 缩放滑块 */}
      <div className="flex items-center justify-center gap-3 px-8 py-4">
        <span className="text-white/60 text-sm">−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-strawberry"
        />
        <span className="text-white/60 text-sm">+</span>
      </div>
    </div>
  )
}
