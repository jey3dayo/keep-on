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
      icon: LayoutDashboard,
      titleKey: 'navigation.dashboard',
      url: '/dashboard',
    },
    {
      icon: ListChecks,
      titleKey: 'navigation.habits',
      url: '/habits',
    },
    {
      icon: BarChart3,
      titleKey: 'navigation.analytics',
      url: '/analytics',
    },
  ],
  secondary: [
    {
      icon: Settings,
      titleKey: 'navigation.settings',
      url: '/settings',
    },
    {
      icon: HelpCircle,
      titleKey: 'navigation.help',
      url: '/help',
    },
  ],
}

// パスからページタイトルの翻訳キーを取得するマッピング
export const PAGE_TITLE_KEYS: Record<string, string> = {
  '/': 'navigation.dashboard',
  '/analytics': 'navigation.analytics',
  '/dashboard': 'navigation.dashboard',
  '/habits': 'navigation.habits',
  '/help': 'navigation.help',
  '/settings': 'navigation.settings',
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
