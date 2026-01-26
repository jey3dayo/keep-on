'use client'

import { useEffect, useState } from 'react'
import { COMPLETION_ACTION_LABEL } from '@/constants/habit'
import { cn } from '@/lib/utils'
import { Icon, type IconName } from './Icon'

export interface HabitCircleProps {
  /** 習慣名 */
  habitName: string
  /** アイコン */
  icon?: IconName | null
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
    icon: 24,
    check: 16,
  },
  md: {
    container: 'w-24 h-24',
    svg: 90,
    circle: 42,
    icon: 36,
    check: 24,
  },
  lg: {
    container: 'w-32 h-32',
    svg: 120,
    circle: 56,
    icon: 48,
    check: 32,
  },
}

export function HabitCircle({ habitName, icon, completed, onClick, size = 'md', className }: HabitCircleProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const sizeConfig = sizeMap[size]
  const iconName = icon ?? 'circle-check'

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
      aria-label={`${habitName}を${completed ? COMPLETION_ACTION_LABEL.markIncomplete : COMPLETION_ACTION_LABEL.markComplete}`}
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
            <Icon name="check" size={sizeConfig.check} strokeWidth={3} />
          </div>
        ) : (
          <Icon className="text-foreground" name={iconName} size={sizeConfig.icon} />
        )}
      </div>
    </button>
  )
}
