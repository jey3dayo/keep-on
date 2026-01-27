import { cookies } from 'next/headers'

export async function getServerCookie(key: string): Promise<string | null> {
  const store = await cookies()
  return store.get(key)?.value ?? null
}
