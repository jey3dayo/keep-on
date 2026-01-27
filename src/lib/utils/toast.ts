import { toast } from 'sonner'

/**
 * 統一されたtoastヘルパー
 * エラー時はconsole.errorも出力する
 */
export const appToast = {
  success: (message: string, description?: string) => {
    toast.success(message, { description })
  },
  error: (message: string, error?: Error | { message: string } | unknown) => {
    // エラー詳細をコンソールに出力
    if (error) {
      console.error(message, error)
    }

    // ユーザー向けに簡潔なメッセージを表示
    let description: string | undefined
    if (error instanceof Error) {
      description = error.message
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      description = (error as { message: string }).message
    }

    toast.error(message, { description })
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description })
  },
}
