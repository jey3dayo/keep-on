import * as React from 'react'
import { Input as BaseInput } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
