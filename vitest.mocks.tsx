import type { ReactNode } from 'react'
import { vi } from 'vitest'

// window.matchMedia モック (next-themes用)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Vaul (Drawer) コンポーネントの jsdom 環境での未ハンドルエラーを抑制
vi.mock('vaul', async () => {
  const actual = await vi.importActual<typeof import('vaul')>('vaul')

  return {
    ...actual,
    Root: ({ children, open }: { children: ReactNode; open?: boolean }) => (
      <div data-state={open ? 'open' : 'closed'} data-vaul-drawer="">
        {children}
      </div>
    ),
  }
})

// next/navigation を最低限モックして App Router 依存を回避
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// UI Drawer コンポーネントをモック
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: ReactNode; open?: boolean }) => (
    <div data-state={open ? 'open' : 'closed'} data-vaul-drawer="">
      {children}
    </div>
  ),
  DrawerTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div data-state="open" data-vaul-drawer="">
      {children}
    </div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))
