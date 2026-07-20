import React from 'react'
import { Icon } from '../icons/Icons'

export const TitleBar: React.FC = () => (
  <header className="h-10 flex items-center px-4 gap-2 border-b border-divider">
    <Icon name="folder" size={18} />
    <span className="font-semibold">照片适配助手</span>
    <span className="ml-auto text-caption text-fg-muted">标准兼容模式</span>
  </header>
)
