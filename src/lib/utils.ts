import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind CSS のクラス名を結合してマージする
 * class-variance-authority と tailwind-merge を使用
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
