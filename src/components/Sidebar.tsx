/**
 * Sidebar コンポーネントのラッパー
 * SidebarInput のみカスタマイズして、パスワードマネージャーのサジェストを無効化
 */

// shadcn/ui の sidebar からすべてをエクスポート（SidebarInput 以外）
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

// カスタム SidebarInput をエクスポート
export { SidebarInput } from './SidebarInput'
