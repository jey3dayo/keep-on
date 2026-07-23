import type { ReactNode } from 'react'
import { vi } from 'vitest'

// localStorage モック（jsdom の実装が不完全な場合に備えて）
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    clear: (): void => {
      store = {}
    },
    getItem: (key: string): string | null => store[key] ?? null,
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number {
      return Object.keys(store).length
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    setItem: (key: string, value: string): void => {
      store[key] = String(value)
    },
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
})

// window.matchMedia モック (next-themes用)
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
  writable: true,
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
  notFound: vi.fn(),
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// UI Drawer コンポーネントをモック
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: ReactNode; open?: boolean }) => (
    <div data-state={open ? 'open' : 'closed'} data-vaul-drawer="">
      {children}
    </div>
  ),
  DrawerClose: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div data-state="open" data-vaul-drawer="">
      {children}
    </div>
  ),
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
