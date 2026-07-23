import type { LucideIcon } from 'lucide-react'
import { BarChart3, HelpCircle, LayoutDashboard, ListChecks, Settings } from 'lucide-react'

export interface NavItem {
  icon: LucideIcon
  titleKey: string
  url: string
}

export const NAV_ITEMS: {
  main: NavItem[]
  secondary: NavItem[]
} = {
  main: [
    {
      titleKey: 'navigation.dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      titleKey: 'navigation.habits',
      url: '/habits',
      icon: ListChecks,
    },
    {
      titleKey: 'navigation.analytics',
      url: '/analytics',
      icon: BarChart3,
    },
  ],
  secondary: [
    {
      titleKey: 'navigation.settings',
      url: '/settings',
      icon: Settings,
    },
    {
      titleKey: 'navigation.help',
      url: '/help',
      icon: HelpCircle,
    },
  ],
}

// パスからページタイトルの翻訳キーを取得するマッピング
export const PAGE_TITLE_KEYS: Record<string, string> = {
  '/dashboard': 'navigation.dashboard',
  '/': 'navigation.dashboard',
  '/habits': 'navigation.habits',
  '/settings': 'navigation.settings',
  '/analytics': 'navigation.analytics',
  '/help': 'navigation.help',
}

export function getPageTitleKey(pathname: string): string {
  // 完全一致で検索
  if (pathname in PAGE_TITLE_KEYS) {
    return PAGE_TITLE_KEYS[pathname]
  }

  // パスの先頭部分でマッチング
  const prefixEntries = Object.entries(PAGE_TITLE_KEYS)
    .filter(([path]) => path !== '/')
    .sort(([a], [b]) => b.length - a.length)

  for (const [path, titleKey] of prefixEntries) {
    if (pathname.startsWith(path)) {
      return titleKey
    }
  }

  return 'navigation.dashboard'
}
