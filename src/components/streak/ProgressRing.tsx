import {
  PROGRESS_RING_DURATION_PER_PERCENT_MS,
  PROGRESS_RING_MAX_DURATION_MS,
  PROGRESS_RING_MIN_DURATION_MS,
} from '@/constants/interaction'

export function getProgressRingDurationMs(deltaPercent: number): number {
  return Math.min(
    Math.max(deltaPercent * PROGRESS_RING_DURATION_PER_PERCENT_MS, PROGRESS_RING_MIN_DURATION_MS),
    PROGRESS_RING_MAX_DURATION_MS
  )
}

export function ProgressRing({
  duration = PROGRESS_RING_MIN_DURATION_MS,
  progress,
  size = 140,
  strokeWidth = 6,
  progressColor,
  backgroundColor,
}: {
  duration?: number
  progress: number
  size?: number
  strokeWidth?: number
  progressColor: string
  backgroundColor: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} />
      <circle
        className="transition-[stroke-dashoffset] ease-linear motion-reduce:transition-none"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={progressColor}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        style={{ transitionDuration: `${duration}ms` }}
      />
    </svg>
  )
}
