import type { Args } from '@storybook/react'
import { composeStory } from '@storybook/react'
import { render } from '@testing-library/react'
import { toast } from 'sonner'

/**
 * `import.meta.vitest` ブロックから Storybook の CSF3 ストーリーを
 * Testing Library でレンダリングするための共通ヘルパー。
 *
 * 各 stories ファイルの `meta` は `satisfies Meta<typeof X>` で narrowing
 * されているため、`Meta<typeof X>` が本来持つ `.args` / `.decorators` /
 * `.component` に自前でアクセスしようとすると構造的に一致せず型エラーになる。
 * Storybook 公式の `composeStory` は meta とストーリーの args / decorators /
 * component を正しい型で合成した「レンダリング可能なコンポーネント」を返すため、
 * この関数はそれをそのまま Testing Library の `render` に渡すだけでよい。
 */
type ComposeStoryParameters<TArgs extends Args> = Parameters<typeof composeStory<TArgs>>

export function renderStory<TArgs extends Args>(
  story: ComposeStoryParameters<TArgs>[0],
  meta: ComposeStoryParameters<TArgs>[1]
) {
  const Composed = composeStory(story, meta)
  return render(<Composed />)
}

/**
 * Storybookでのデモ用toastヘルパー
 * SSR環境では何もしない
 */
export const storybookToast = {
  error: (message: string, description?: string) => {
    if (typeof window === 'undefined') {
      return
    }
    toast.error(message, { description })
  },
  info: (message: string, description?: string) => {
    if (typeof window === 'undefined') {
      return
    }
    toast.info(message, { description })
  },
  success: (message: string, description?: string) => {
    if (typeof window === 'undefined') {
      return
    }
    toast.success(message, { description })
  },
}
