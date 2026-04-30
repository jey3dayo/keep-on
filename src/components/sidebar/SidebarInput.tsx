import { Input } from '@/components/basics/Input'

/**
 * Sidebar専用のInputコンポーネント
 * パスワードマネージャーのサジェストを無効化
 */
export const SidebarInput = ({ ref, ...props }: React.ComponentProps<typeof Input>) => <Input ref={ref} {...props} />

SidebarInput.displayName = 'SidebarInput'
