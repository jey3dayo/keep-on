export function ProgressRing({
  progress,
  size = 140,
  strokeWidth = 6,
  progressColor,
  backgroundColor,
}: {
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
    <svg aria-hidden="true" className="absolute inset-0 -rotate-90" height={size} width={size}>
      <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} />
      <circle
        className="transition-all duration-500 ease-out motion-reduce:transition-none"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={progressColor}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}
