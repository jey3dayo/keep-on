import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import * as React from 'react'
import { Button } from '@/components/ui/button'

type IconLabelButtonProps = Omit<ComponentPropsWithoutRef<typeof Button>, 'children'> & {
  icon: ReactNode
  label: string
  iconOnly?: boolean
}

const IconLabelButton = React.forwardRef<HTMLButtonElement, IconLabelButtonProps>(
  ({ icon, label, iconOnly = false, size, ...props }, ref) => {
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
)
IconLabelButton.displayName = 'IconLabelButton'

export { IconLabelButton, type IconLabelButtonProps }
