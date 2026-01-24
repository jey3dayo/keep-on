import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * エラー状態の表示
   */
  error?: boolean
  /**
   * パスワードマネージャーのサジェストを無効化するか
   * @default true
   */
  disablePasswordManagers?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disablePasswordManagers = true, type = 'text', ...props }, ref) => {
    const passwordManagerProps = disablePasswordManagers
      ? {
          autoComplete: 'off',
          'data-1p-ignore': true,
          'data-lpignore': 'true',
          'data-form-type': 'other',
        }
      : {}

    return (
      <input
        className={cn(
          'w-full rounded-md border bg-background px-4 py-2 text-foreground transition-colors placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-input',
          className
        )}
        ref={ref}
        type={type}
        {...passwordManagerProps}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
