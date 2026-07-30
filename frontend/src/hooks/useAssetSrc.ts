import { convertFileSrc } from '@tauri-apps/api/tauri'
import { useMemo, useRef, useState } from 'react'

/**
 * 把本地文件路径转成可在 <img src> 加载的 asset URL。
 * convertFileSrc 依赖 window.__TAURI_INTERNALS__，非 Tauri 环境（纯 dev）会抛错；
 * 图片解码失败（如部分 WebView 不支持的 HEIC）经 onError 标记。
 * 任一失败返回 src=null，由调用方渲染占位。path 变化时自动重置失败态。
 */
export const useAssetSrc = (path: string) => {
  const src = useMemo(() => {
    try {
      return convertFileSrc(path)
    } catch {
      return null
    }
  }, [path])
  const [failed, setFailed] = useState(false)
  // path 变化时重置失败态（render 中调整 state 的官方模式），避免上一张解码失败影响下一张
  const prevPath = useRef(path)
  if (prevPath.current !== path) {
    prevPath.current = path
    setFailed(false)
  }
  return { src: failed ? null : src, failed, onError: () => setFailed(true) }
}
