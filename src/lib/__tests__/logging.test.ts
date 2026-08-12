import { describe, expect, it } from 'vitest'
import { isDatabaseError, isTimeoutError, logSpan } from '../logging'

describe('isDatabaseError', () => {
  // 契約: classifyConnectionError が 'timeout' | 'network' | 'connection' を返す場合のみ
  // リトライ対象とする（db-retry.ts の retryOn がこの結果でリトライ判定を行う）。
  // 'auth'（設定の問題）と 'unknown'（予期しないエラー）はリトライしない。
  it('code=ETIMEDOUT はタイムアウト分類としてリトライ対象になる', () => {
    expect(isDatabaseError({ code: 'ETIMEDOUT', message: 'boom' })).toBe(true)
  })

  it('message="Connection timed out" はタイムアウト分類としてリトライ対象になる', () => {
    expect(isDatabaseError({ message: 'Connection timed out' })).toBe(true)
  })

  it('code=ECONNREFUSED はネットワーク分類としてリトライ対象になる', () => {
    expect(isDatabaseError({ code: 'ECONNREFUSED', message: 'boom' })).toBe(true)
  })

  it('message に "ENOTFOUND" を含む場合はネットワーク分類としてリトライ対象になる', () => {
    expect(isDatabaseError({ message: 'getaddrinfo ENOTFOUND db.example.com' })).toBe(true)
  })

  it('code=ECONNRESET は接続分類としてリトライ対象になる', () => {
    expect(isDatabaseError({ code: 'ECONNRESET', message: 'boom' })).toBe(true)
  })

  it('message に "connection terminated" を含む場合は接続分類としてリトライ対象になる', () => {
    expect(isDatabaseError({ message: 'Connection terminated unexpectedly' })).toBe(true)
  })

  it('message に "authentication failed" を含む場合は認証分類としてリトライ対象外になる', () => {
    expect(isDatabaseError({ message: 'authentication failed for user' })).toBe(false)
  })

  it('message に "password" を含む場合は認証分類としてリトライ対象外になる', () => {
    expect(isDatabaseError({ message: 'invalid password' })).toBe(false)
  })

  it('分類パターンに一致しないメッセージは unknown 分類としてリトライ対象外になる', () => {
    expect(isDatabaseError({ message: 'something completely unexpected happened' })).toBe(false)
  })

  it('null は unknown 分類としてリトライ対象外になる', () => {
    expect(isDatabaseError(null)).toBe(false)
  })

  it('undefined は unknown 分類としてリトライ対象外になる', () => {
    expect(isDatabaseError(undefined)).toBe(false)
  })

  it('文字列は unknown 分類としてリトライ対象外になる', () => {
    expect(isDatabaseError('db connection timeout')).toBe(false)
  })

  it('message プロパティを持たないプレーンオブジェクトは unknown 分類としてリトライ対象外になる', () => {
    expect(isDatabaseError({ foo: 'bar' })).toBe(false)
  })

  it('Error インスタンス（message経由でtimeoutと判定される場合）はリトライ対象になる', () => {
    expect(isDatabaseError(new Error('Query timeout exceeded'))).toBe(true)
  })

  it('Error インスタンス（分類に一致しないメッセージ）は unknown 分類としてリトライ対象外になる', () => {
    expect(isDatabaseError(new Error('unexpected failure'))).toBe(false)
  })
})

describe('isTimeoutError', () => {
  it('logSpan が生成する TimeoutError（name="TimeoutError"）を true と判定する', async () => {
    let caught: unknown
    try {
      await logSpan('test-span', () => new Promise(() => undefined), undefined, { timeoutMs: 1 })
    } catch (error) {
      caught = error
    }
    expect(isTimeoutError(caught)).toBe(true)
  })

  it('name プロパティが "TimeoutError" のプレーンオブジェクトを true と判定する', () => {
    expect(isTimeoutError({ name: 'TimeoutError' })).toBe(true)
  })

  it('通常の Error インスタンスは false と判定する', () => {
    expect(isTimeoutError(new Error('boom'))).toBe(false)
  })

  it('null は false と判定する', () => {
    expect(isTimeoutError(null)).toBe(false)
  })

  it('undefined は false と判定する', () => {
    expect(isTimeoutError(undefined)).toBe(false)
  })

  it('プリミティブな文字列は false と判定する', () => {
    expect(isTimeoutError('TimeoutError')).toBe(false)
  })
})

describe('logSpan', () => {
  // 回帰テスト: fnPromise に .catch() を付与した後、race の else 分岐が
  // fn() を再度呼んでいたことで timeoutMs 未指定時に fn が2回実行されるバグがあった。
  it('timeoutMs 未指定時は fn が1回だけ呼ばれる', async () => {
    let callCount = 0
    const fn = () => {
      callCount += 1
      return Promise.resolve('result')
    }

    const result = await logSpan('test-span-no-timeout', fn)

    expect(callCount).toBe(1)
    expect(result).toBe('result')
  })

  it('timeoutMs 指定時に通常完了しても fn が1回だけ呼ばれる', async () => {
    let callCount = 0
    const fn = () => {
      callCount += 1
      return Promise.resolve('result')
    }

    const result = await logSpan('test-span-with-timeout', fn, undefined, { timeoutMs: 1000 })

    expect(callCount).toBe(1)
    expect(result).toBe('result')
  })
})
