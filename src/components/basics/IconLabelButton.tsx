import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type IconLabelButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  icon: ReactNode
  label: string
  iconOnly?: boolean
}

const IconLabelButton = ({ icon, label, iconOnly = false, size, ref, ...props }: IconLabelButtonProps) => {
  const ariaLabel = props['aria-label'] ?? label

  if (iconOnly) {
    return (
      <Button aria-label={ariaLabel} ref={ref} size={size ?? 'icon'} {...props}>
        {icon}
      </Button>
    )
  }

  return (
    <Button ref={ref} size={size} {...props}>
      {icon}
      {label}
    </Button>
  )
}
IconLabelButton.displayName = 'IconLabelButton'

export { IconLabelButton }
