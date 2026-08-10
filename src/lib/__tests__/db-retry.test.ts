import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RETRY_MAX_ATTEMPTS } from '@/constants/retry'
import { withDbRetry } from '../db-retry'

// withDbRetry のデフォルト onRetry が resetDb() を呼ぶため、DB 接続をモック化する
vi.mock('@/lib/db', () => ({
  resetDb: vi.fn(),
}))

const timeoutError = () => new Error('Connection timeout')
const authError = () => new Error('authentication failed')

describe('withDbRetry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1回目で成功したらリトライせずその値を返す', async () => {
    const fn = vi.fn().mockResolvedValue('ok')

    const result = await withDbRetry('test', fn)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('isDatabaseErrorがtrueを返すエラー（timeout）では再試行し、途中で成功した値を返す', async () => {
    const fn = vi.fn().mockRejectedValueOnce(timeoutError()).mockResolvedValueOnce('recovered')

    const result = await withDbRetry('test', fn)

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('isDatabaseErrorがfalseを返すエラー（authentication failed）では再試行せず即座に失敗する', async () => {
    const error = authError()
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withDbRetry('test', fn)).rejects.toBe(error)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it(`リトライ対象エラーが続く場合、src/constants/retry.ts の RETRY_MAX_ATTEMPTS(=${RETRY_MAX_ATTEMPTS}) 回まで試行して最後のエラーを伝播する`, async () => {
    const errors = Array.from({ length: RETRY_MAX_ATTEMPTS + 1 }, (_, i) => new Error(`Connection timeout ${i}`))
    const fn = vi.fn()
    for (const error of errors) {
      fn.mockRejectedValueOnce(error)
    }

    await expect(withDbRetry('test', fn, { maxRetries: RETRY_MAX_ATTEMPTS })).rejects.toBe(errors[RETRY_MAX_ATTEMPTS])
    // 初回試行 + maxRetries 回の再試行 = maxRetries + 1 回呼ばれる
    expect(fn).toHaveBeenCalledTimes(RETRY_MAX_ATTEMPTS + 1)
  })

  it('maxRetriesを指定しない場合はデフォルト値(1)で1回だけ再試行する', async () => {
    const fn = vi.fn().mockRejectedValue(timeoutError())

    await expect(withDbRetry('test', fn)).rejects.toThrow('Connection timeout')
    // デフォルト maxRetries=1: 初回 + 1回の再試行 = 2回
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('カスタムretryOnを渡すとisDatabaseErrorの代わりに使用される', async () => {
    const customError = new Error('custom-retryable')
    const fn = vi.fn().mockRejectedValueOnce(customError).mockResolvedValueOnce('ok')
    const retryOn = vi.fn().mockReturnValue(true)

    const result = await withDbRetry('test', fn, { retryOn })

    expect(result).toBe('ok')
    expect(retryOn).toHaveBeenCalledWith(customError)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('onRetryを指定するとデフォルトのresetDbの代わりに呼ばれ、試行回数とエラーを受け取る', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined)
    const error = timeoutError()
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok')

    const result = await withDbRetry('test', fn, { onRetry })

    expect(result).toBe('ok')
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, error)
  })
})
