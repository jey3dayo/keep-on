import * as React from 'react'
import { Input } from '@/components/basics/Input'

/**
 * Sidebar専用のInputコンポーネント
 * パスワードマネージャーのサジェストを無効化
 */
export const SidebarInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>((props, ref) => {
  return <Input ref={ref} {...props} />
})

SidebarInput.displayName = 'SidebarInput'
