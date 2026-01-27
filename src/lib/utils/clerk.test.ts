import { describe, expect, it } from 'vitest'
import { isMissingClerkProviderError } from '@/lib/utils/clerk'

describe('isMissingClerkProviderError', () => {
  it('Error 以外は false', () => {
    expect(isMissingClerkProviderError('error')).toBe(false)
  })

  it('MissingClerkProvider を含むメッセージを検知する', () => {
    const error = new Error('MissingClerkProvider: something went wrong')

    expect(isMissingClerkProviderError(error)).toBe(true)
  })

  it('ClerkProvider の断片を含むメッセージを検知する', () => {
    const error = new Error('UserButton can only be used within the <ClerkProvider /> component.')

    expect(isMissingClerkProviderError(error)).toBe(true)
  })

  it('関係ないメッセージは false', () => {
    const error = new Error('Something else failed')

    expect(isMissingClerkProviderError(error)).toBe(false)
  })
})
