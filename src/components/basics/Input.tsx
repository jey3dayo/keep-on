import type * as React from 'react'
import { Input as BaseInput } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InputProps extends React.ComponentProps<'input'> {
  disablePasswordManagers?: boolean
  error?: boolean
}

const Input = ({ className, error, disablePasswordManagers = true, ref, ...props }: InputProps) => {
  const passwordManagerProps = disablePasswordManagers
    ? {
        autoComplete: props.autoComplete || 'off',
        'data-1p-ignore': true,
        'data-form-type': 'other',
        'data-lpignore': 'true',
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
Input.displayName = 'Input'

export { Input }
