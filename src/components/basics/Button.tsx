import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Icon } from '@/components/basics/Icon'
import { Button as BaseButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const buttonVariants = cva('focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95', {
  variants: {
    variant: {
      default: '',
      primary: '',
      destructive: '',
      outline: '',
      secondary: '',
      ghost: '',
      link: '',
    },
    size: {
      default: 'h-10',
      sm: '',
      lg: 'h-11',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type = 'button', ...props }, ref) => {
    const baseVariant = variant === 'primary' ? 'default' : variant

    return (
      <BaseButton
        asChild={asChild}
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        size={size}
        type={type}
        variant={baseVariant}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

interface AddHabitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: boolean
}

export function AddHabitButton({ children, icon = true, className, ...props }: AddHabitButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground shadow-lg transition-all hover:scale-105 hover:bg-accent/80 active:scale-95',
        className
      )}
      type="button"
      {...props}
    >
      {icon && <Icon className="h-5 w-5" name="plus" />}
      {children}
    </button>
  )
}

interface CheckInButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  completed?: boolean
}

export function CheckInButton({ children, completed = false, className, ...props }: CheckInButtonProps) {
  return (
    <button
      className={cn(
        'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95',
        completed && 'ring-2 ring-offset-2 ring-offset-background',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button, buttonVariants, type ButtonProps }
