import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GENERIC_ACTION_ERROR_MESSAGE } from '@/lib/errors/serializable'
import { HabitActionDialog } from './HabitActionDialog'

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDialogTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('HabitActionDialog', () => {
  beforeEach(() => {
    toastErrorMock.mockReset()
  })

  it('未知例外のraw messageを表示せず共通メッセージを表示する', async () => {
    const rawError = new Error('内部実装の詳細')
    const action = vi.fn().mockRejectedValue(rawError)

    render(
      <HabitActionDialog
        action={action}
        confirmLabel="実行"
        defaultOpen
        description="説明"
        errorMessage="操作エラー"
        habitId="habit-123"
        retryOnError={false}
        successMessage="成功"
        title="確認"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '実行' }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('操作エラー', {
        description: GENERIC_ACTION_ERROR_MESSAGE,
      })
    })
    expect(toastErrorMock).not.toHaveBeenCalledWith(
      '操作エラー',
      expect.objectContaining({ description: rawError.message })
    )
  })
})
