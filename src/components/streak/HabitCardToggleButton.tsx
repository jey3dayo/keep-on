import * as React from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HabitCardToggleButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'ghost', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <Button
        className={cn(
          'h-auto w-full whitespace-normal rounded-lg p-6 text-left font-normal text-base text-white',
          'transition-shadow transition-transform hover:scale-102 hover:text-white hover:shadow-lg',
          'focus-visible:ring-offset-2',
          className
        )}
        ref={ref}
        size={size}
        type={type}
        variant={variant}
        {...props}
      />
    )
  }
)
HabitCardToggleButton.displayName = 'HabitCardToggleButton'

export { HabitCardToggleButton }
