import { useState, useEffect, useRef } from 'react'
import { getRecordThumb, getRecordFullImage } from '../data/store'

/**
 * 懒加载图片组件
 * 卡片出现在屏幕上时才从 IndexedDB 读取图片
 * @param {string} id - 记录 ID
 * @param {'thumb'|'full'} type - 缩略图或原图
 */
export default function LazyImage({ id, type = 'thumb', className = '', ...imgProps }) {
  const [src, setSrc] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // 用 IntersectionObserver 监听卡片是否进入屏幕
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          const load = async () => {
            const data = type === 'full' ? await getRecordFullImage(id) : await getRecordThumb(id)
            setSrc(data)
          }
          load()
        }
      },
      { rootMargin: '200px' } // 提前 200px 开始加载
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [id, type])

  return (
    <div ref={ref} className={`${className} flex items-center justify-center`}>
      {src ? (
        <img
          src={src}
          alt=""
          className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          {...imgProps}
        />
      ) : null}
      {/* 占位符 */}
      {!src && <span className="text-4xl opacity-40">🍰</span>}
    </div>
  )
}
