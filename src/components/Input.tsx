import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input as BaseInput } from './ui/input'

export interface InputProps extends React.ComponentProps<'input'> {
  error?: boolean
  disablePasswordManagers?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disablePasswordManagers = true, ...props }, ref) => {
    const passwordManagerProps = disablePasswordManagers
      ? {
          'data-1p-ignore': true,
          'data-lpignore': 'true',
          'data-form-type': 'other',
          autoComplete: props.autoComplete || 'off',
        }
      : {}

    return (
      <BaseInput
        className={cn('h-10', error && 'border-destructive', className)}
        ref={ref}
        {...passwordManagerProps}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
