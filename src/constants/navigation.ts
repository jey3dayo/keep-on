import type { LucideIcon } from 'lucide-react'
import { BarChart3, HelpCircle, LayoutDashboard, ListChecks, Settings } from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export const NAV_ITEMS: {
  main: NavItem[]
  secondary: NavItem[]
} = {
  main: [
    {
      title: 'ダッシュボード',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: '習慣',
      url: '/habits',
      icon: ListChecks,
    },
    {
      title: 'アナリティクス',
      url: '/analytics',
      icon: BarChart3,
    },
  ],
  secondary: [
    {
      title: '設定',
      url: '/settings',
      icon: Settings,
    },
    {
      title: 'ヘルプ',
      url: '/help',
      icon: HelpCircle,
    },
  ],
}

// パスからページタイトルを取得するマッピング
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'ダッシュボード',
  '/': 'ダッシュボード',
  '/habits': '習慣',
  '/settings': '設定',
  '/analytics': 'アナリティクス',
  '/help': 'ヘルプ',
}

export function getPageTitle(pathname: string): string {
  // 完全一致で検索
  if (pathname in PAGE_TITLES) {
    return PAGE_TITLES[pathname]
  }

  // パスの先頭部分でマッチング
  const prefixEntries = Object.entries(PAGE_TITLES)
    .filter(([path]) => path !== '/')
    .sort(([a], [b]) => b.length - a.length)

  for (const [path, title] of prefixEntries) {
    if (pathname.startsWith(path)) {
      return title
    }
  }

  return 'ダッシュボード'
}
