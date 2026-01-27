import { toast } from 'sonner'

/**
 * Storybookでのデモ用toastヘルパー
 * SSR環境では何もしない
 */
export const storybookToast = {
  success: (message: string, description?: string) => {
    if (typeof window === 'undefined') {
      return
    }
    toast.success(message, { description })
  },
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
}
