const DB_NAME = 'keepon-offline'
const DB_VERSION = 1
const STORE_NAME = 'checkin-queue'

type RequestState<T> = { completed: false } | { completed: true; result: T }

export interface QueuedCheckin {
  action: 'add' | 'remove'
  dateKey: string
  habitId: string
  id: string
  timestamp: number
  /** enqueue 時のサインイン中ユーザー。replay 前の本人照合に使う（旧アイテムでは undefined） */
  userId?: string
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

/** トランザクション完了後に db.close() して将来の versionchange ブロックを防止 */
const withDb = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const req = fn(store)
    let state: RequestState<T> = { completed: false }
    let isClosed = false

    const closeDb = () => {
      if (!isClosed) {
        isClosed = true
        db.close()
      }
    }

    const rejectTransaction = (error: DOMException | null, fallbackMessage: string) => {
      closeDb()
      reject(error ?? req.error ?? new Error(fallbackMessage))
    }

    req.onsuccess = () => {
      state = { completed: true, result: req.result as T }
    }
    req.onerror = () => rejectTransaction(req.error, 'IndexedDB request failed')
    tx.oncomplete = () => {
      closeDb()
      if (state.completed) {
        resolve(state.result)
        return
      }
      reject(new Error('IndexedDB transaction completed without a successful request'))
    }
    tx.onerror = () => rejectTransaction(tx.error, 'IndexedDB transaction failed')
    tx.onabort = () => rejectTransaction(tx.error, 'IndexedDB transaction aborted')
  })
}

export const enqueueOfflineCheckin = (item: QueuedCheckin): Promise<void> =>
  withDb<IDBValidKey>('readwrite', (store) => store.put(item)).then(() => undefined)

export const getAllQueuedCheckins = (): Promise<QueuedCheckin[]> =>
  withDb<QueuedCheckin[]>('readonly', (store) => store.getAll())

export const removeQueuedCheckin = (id: string): Promise<void> =>
  withDb<undefined>('readwrite', (store) => store.delete(id)).then(() => undefined)
