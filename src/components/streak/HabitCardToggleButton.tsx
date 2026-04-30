import type { Ref } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

type HabitCardToggleButtonProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
}

const HabitCardToggleButton = ({
  variant = 'card',
  size = 'card',
  type = 'button',
  ref,
  ...props
}: HabitCardToggleButtonProps) => <Button ref={ref} size={size} type={type} variant={variant} {...props} />
HabitCardToggleButton.displayName = 'HabitCardToggleButton'

export { HabitCardToggleButton }
