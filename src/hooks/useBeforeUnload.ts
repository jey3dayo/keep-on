import { useEffect } from 'react'

/**
 * ページ離脱時の警告ダイアログを表示するフック
 * @param shouldWarn 警告を表示するかどうか
 */
export function useBeforeUnload(shouldWarn: boolean) {
  useEffect(() => {
    if (!shouldWarn) {
      return
    }

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // モダンブラウザではカスタムメッセージは無視され、ブラウザ標準のメッセージが表示される
      // Chrome/Edge などのモダンブラウザで警告を表示するには returnValue の設定が必要
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handler)

    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [shouldWarn])
}
