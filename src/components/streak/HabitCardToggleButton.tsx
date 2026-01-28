import * as React from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'

const HabitCardToggleButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'card', size = 'card', type = 'button', ...props }, ref) => {
    return <Button ref={ref} size={size} type={type} variant={variant} {...props} />
  }
)
HabitCardToggleButton.displayName = 'HabitCardToggleButton'

export { HabitCardToggleButton }
