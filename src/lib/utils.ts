import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 文字列が空かどうかをチェックする
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0
}

/**
 * 文字列を大文字に変換する
 */
export function toUpperCase(str: string): string {
  return str.toUpperCase()
}

/**
 * 配列の合計を計算する
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0)
}

/**
 * Tailwind CSS のクラス名を結合してマージする
 * class-variance-authority と tailwind-merge を使用
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
