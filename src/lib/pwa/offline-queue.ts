const DB_NAME = 'keepon-offline'
const DB_VERSION = 1
const STORE_NAME = 'checkin-queue'

export interface QueuedCheckin {
  action: 'add' | 'remove'
  dateKey: string
  habitId: string
  id: string
  timestamp: number
}

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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
}

/** トランザクション完了後に db.close() して将来の versionchange ブロックを防止 */
const withDb = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}

export const enqueueOfflineCheckin = (item: QueuedCheckin): Promise<void> =>
  withDb<IDBValidKey>('readwrite', (store) => store.put(item)).then(() => undefined)

export const getAllQueuedCheckins = (): Promise<QueuedCheckin[]> =>
  withDb<QueuedCheckin[]>('readonly', (store) => store.getAll())

export const removeQueuedCheckin = (id: string): Promise<void> =>
  withDb<undefined>('readwrite', (store) => store.delete(id)).then(() => undefined)
