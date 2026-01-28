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
    scale: {
      none: '',
      sm: 'transition-transform hover:scale-102',
      md: 'transition-transform hover:scale-105',
      lg: 'transition-transform hover:scale-110',
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
  ({ className, variant, size, scale, asChild, type = 'button', ...props }, ref) => {
    const baseVariant = variant === 'primary' ? 'default' : variant

    return (
      <BaseButton
        asChild={asChild}
        className={cn(buttonVariants({ variant, size, scale }), className)}
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
    <Button
      className={cn(
        'h-auto rounded-full bg-foreground px-6 py-3 text-background shadow-lg hover:bg-foreground/90',
        className
      )}
      scale="md"
      type="button"
      variant="default"
      {...props}
    >
      {icon && <Icon className="h-5 w-5" name="plus" />}
      {children}
    </Button>
  )
}

interface CheckInButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  completed?: boolean
}

export function CheckInButton({ children, completed = false, className, ...props }: CheckInButtonProps) {
  return (
    <Button
      className={cn(
        'h-14 w-14 flex-shrink-0 rounded-full transition-all duration-300 hover:bg-transparent',
        completed && 'ring-2 ring-offset-2 ring-offset-background',
        className
      )}
      scale="lg"
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  )
}

export { Button, buttonVariants, type ButtonProps }
