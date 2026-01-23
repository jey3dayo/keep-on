import { describe, expect, it } from 'vitest'
import { isEmpty, sum, toUpperCase } from './utils'

describe('utils', () => {
  describe('isEmpty', () => {
    it('空文字列の場合trueを返す', () => {
      expect(isEmpty('')).toBe(true)
    })

    it('空白のみの文字列の場合trueを返す', () => {
      expect(isEmpty('   ')).toBe(true)
    })

    it('nullの場合trueを返す', () => {
      expect(isEmpty(null)).toBe(true)
    })

    it('undefinedの場合trueを返す', () => {
      expect(isEmpty(undefined)).toBe(true)
    })

    it('文字列がある場合falseを返す', () => {
      expect(isEmpty('hello')).toBe(false)
    })
  })

  describe('toUpperCase', () => {
    it('文字列を大文字に変換する', () => {
      expect(toUpperCase('hello')).toBe('HELLO')
    })

    it('すでに大文字の場合そのまま返す', () => {
      expect(toUpperCase('HELLO')).toBe('HELLO')
    })

    it('混在した文字列を大文字に変換する', () => {
      expect(toUpperCase('HeLLo WoRLd')).toBe('HELLO WORLD')
    })
  })

  describe('sum', () => {
    it('配列の合計を計算する', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15)
    })

    it('空配列の場合0を返す', () => {
      expect(sum([])).toBe(0)
    })

    it('負の数を含む配列の合計を計算する', () => {
      expect(sum([1, -2, 3, -4, 5])).toBe(3)
    })

    it('単一要素の配列の場合その値を返す', () => {
      expect(sum([42])).toBe(42)
    })
  })
})
