// 格式化工具：字节体积、时长、百分比

export function fmtSize(bytes: number): string {
  if (!bytes || bytes < 0) {
    return '—'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)} MB`
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function fmtTime(secs: number): string {
  if (!secs || secs < 0) {
    return '--:--'
  }
  const s = Math.floor(secs)
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function fmtPercent(done: number, total: number): number {
  if (!total) {
    return 0
  }
  return Math.min(100, Math.round((done / total) * 100))
}

// 相对时间（刚刚 / N 分钟前 / N 天前 / N 周前 / N 个月前），用于最近文件夹
export function fmtRelative(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) {
    return '刚刚'
  }
  if (min < 60) {
    return `${min} 分钟前`
  }
  const hr = Math.floor(min / 60)
  if (hr < 24) {
    return `${hr} 小时前`
  }
  const day = Math.floor(hr / 24)
  if (day < 7) {
    return `${day} 天前`
  }
  if (day < 30) {
    return `${Math.floor(day / 7)} 周前`
  }
  return `${Math.floor(day / 30)} 个月前`
}
