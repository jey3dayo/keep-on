'use client'

import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface HabitCircleProps {
  /** 習慣名 */
  habitName: string
  /** 絵文字アイコン */
  emoji?: string | null
  /** 完了状態 */
  completed: boolean
  /** クリックハンドラー */
  onClick?: () => void
  /** サイズバリアント */
  size?: 'sm' | 'md' | 'lg'
  /** カスタムクラス名 */
  className?: string
}

const sizeMap = {
  sm: {
    container: 'w-16 h-16',
    svg: 60,
    circle: 28,
    emoji: 'text-2xl',
    check: 16,
  },
  md: {
    container: 'w-24 h-24',
    svg: 90,
    circle: 42,
    emoji: 'text-4xl',
    check: 24,
  },
  lg: {
    container: 'w-32 h-32',
    svg: 120,
    circle: 56,
    emoji: 'text-5xl',
    check: 32,
  },
}

export function HabitCircle({ habitName, emoji, completed, onClick, size = 'md', className }: HabitCircleProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const sizeConfig = sizeMap[size]

  const centerX = sizeConfig.svg / 2
  const centerY = sizeConfig.svg / 2
  const radius = sizeConfig.circle
  const circumference = 2 * Math.PI * radius

  // 完了時のアニメーション
  useEffect(() => {
    if (completed) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [completed])

  return (
    <button
      aria-label={`${habitName}を${completed ? '未完了' : '完了'}にする`}
      className={cn(
        'relative flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95',
        sizeConfig.container,
        className
      )}
      onClick={onClick}
      type="button"
    >
      {/* SVG サークルプログレス */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 -rotate-90"
        height={sizeConfig.svg}
        viewBox={`0 0 ${sizeConfig.svg} ${sizeConfig.svg}`}
        width={sizeConfig.svg}
      >
        {/* 背景サークル */}
        <circle
          className="text-muted opacity-30"
          cx={centerX}
          cy={centerY}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
        />

        {/* プログレスサークル */}
        <circle
          className={cn('text-primary transition-all duration-600', {
            'animate-progress-fill': isAnimating,
            'animate-pulse-ring': !completed,
          })}
          cx={centerX}
          cy={centerY}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={completed ? 0 : circumference}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>

      {/* 中央コンテンツ */}
      <div className="relative z-10 flex items-center justify-center">
        {completed ? (
          <div
            className={cn('flex items-center justify-center rounded-full bg-primary text-primary-foreground', {
              'animate-check-mark': isAnimating,
            })}
            style={{
              width: sizeConfig.check * 1.5,
              height: sizeConfig.check * 1.5,
            }}
          >
            <Check size={sizeConfig.check} strokeWidth={3} />
          </div>
        ) : (
          <span className={cn('select-none', sizeConfig.emoji)}>{emoji || '✓'}</span>
        )}
      </div>
    </button>
  )
}
