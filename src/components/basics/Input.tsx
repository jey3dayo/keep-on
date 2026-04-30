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
Input.displayName = 'Input'

export { Input }
