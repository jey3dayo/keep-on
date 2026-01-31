import type { KVNamespace } from '@/types/cloudflare'

/**
 * KV Namespace のモック実装
 */
export function createMockKV(): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>()

  const kv = {
    store,
    get: (key: string, type?: 'text' | 'json') => {
      const value = store.get(key)
      if (value === undefined) {
        return Promise.resolve(null)
      }

      if (type === 'json') {
        try {
          return Promise.resolve(JSON.parse(value))
        } catch {
          return Promise.resolve(null)
        }
      }

      return Promise.resolve(value)
    },
    put: (key: string, value: string) => {
      store.set(key, value)
      return Promise.resolve()
    },
    delete: (key: string) => {
      store.delete(key)
      return Promise.resolve()
    },
  }

  // TypeScriptのオーバーロード対応のため、型アサーションを使用
  return kv as KVNamespace & { store: Map<string, string> }
}
