import { describe, expect, it } from 'vitest'
import { formatErrorObject } from './logging'

describe('formatErrorObject', () => {
  it('通常の Error は { name, message } のみ返す', () => {
    const error = new Error('something went wrong')
    const result = formatErrorObject(error)

    expect(result).toEqual({ message: 'something went wrong', name: 'Error' })
  })

  it('PostgresError ライクなオブジェクトから DB フィールドを抽出する', () => {
    const error = {
      code: '23505',
      constraint_name: 'Checkin_habitId_date_unique',
      message: 'duplicate key value violates unique constraint',
      name: 'PostgresError',
      severity: 'ERROR',
      table_name: 'Checkin',
    }
    const result = formatErrorObject(error)

    expect(result.name).toBe('PostgresError')
    expect(result.code).toBe('23505')
    expect(result.severity).toBe('ERROR')
    expect(result.constraint_name).toBe('Checkin_habitId_date_unique')
    expect(result.table_name).toBe('Checkin')
  })

  it('Error サブクラス（PostgresError）の詳細フィールドも抽出する', () => {
    // postgres-js の PostgresError を模倣した Error サブクラス
    class PostgresError extends Error {
      code: string
      severity: string
      constraint_name: string
      table_name: string

      constructor(
        message: string,
        details: { code: string; severity: string; constraint_name: string; table_name: string }
      ) {
        super(message)
        this.name = 'PostgresError'
        this.code = details.code
        this.severity = details.severity
        this.constraint_name = details.constraint_name
        this.table_name = details.table_name
      }
    }

    const error = new PostgresError('duplicate key value violates unique constraint', {
      code: '23505',
      constraint_name: 'Checkin_habitId_date_unique',
      severity: 'ERROR',
      table_name: 'Checkin',
    })
    const result = formatErrorObject(error)

    expect(result.name).toBe('PostgresError')
    expect(result.message).toBe('duplicate key value violates unique constraint')
    expect(result.code).toBe('23505')
    expect(result.severity).toBe('ERROR')
    expect(result.constraint_name).toBe('Checkin_habitId_date_unique')
    expect(result.table_name).toBe('Checkin')
  })

  it('cause チェーンは1レベルだけ含める', () => {
    const error = {
      cause: {
        cause: {
          message: 'nested cause should be ignored',
        },
        code: '23505',
        message: 'duplicate key',
      },
      message: 'query failed',
      name: 'DatabaseError',
    }
    const result = formatErrorObject(error)

    expect(result.cause).toEqual({ code: '23505', message: 'duplicate key' })
  })

  it('長い query は200文字で切り詰める', () => {
    const longQuery = `SELECT ${'x'.repeat(300)}`
    const error = {
      message: 'syntax error',
      name: 'PostgresError',
      query: longQuery,
    }
    const result = formatErrorObject(error)

    expect(typeof result.query).toBe('string')
    expect((result.query as string).length).toBe(203) // 200 + '...'
    expect((result.query as string).endsWith('...')).toBe(true)
  })

  it('200文字以下の query はそのまま含める', () => {
    const shortQuery = 'SELECT * FROM habits'
    const error = {
      message: 'error',
      name: 'PostgresError',
      query: shortQuery,
    }
    const result = formatErrorObject(error)

    expect(result.query).toBe(shortQuery)
  })

  it('parameters プロパティは出力に含めない', () => {
    const error = {
      code: '23505',
      message: 'error',
      name: 'PostgresError',
      parameters: ['user-secret-data', 'another-secret'],
    }
    const result = formatErrorObject(error)

    expect(result.code).toBe('23505')
    expect(result).not.toHaveProperty('parameters')
  })

  it('空文字のフィールドは出力に含めない', () => {
    const error = {
      code: '23505',
      constraint_name: 'some_constraint',
      detail: '',
      message: 'error',
      name: 'PostgresError',
      severity: '',
    }
    const result = formatErrorObject(error)

    expect(result.code).toBe('23505')
    expect(result.constraint_name).toBe('some_constraint')
    expect(result).not.toHaveProperty('severity')
    expect(result).not.toHaveProperty('detail')
  })

  it('Error インスタンスの cause も抽出する', () => {
    const cause = { code: '08006', message: 'connection refused' }
    const error = new Error('query failed')
    ;(error as unknown as { cause: unknown }).cause = cause
    const result = formatErrorObject(error)

    expect(result.name).toBe('Error')
    expect(result.cause).toEqual({ code: '08006', message: 'connection refused' })
  })

  it('非オブジェクトのエラーは UnknownError として処理する', () => {
    const result = formatErrorObject('string error')

    expect(result.name).toBe('UnknownError')
    expect(result.message).toBe('string error')
  })
})
