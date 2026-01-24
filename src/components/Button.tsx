import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button as BaseButton } from './ui/button'

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

export { Button, buttonVariants, type ButtonProps }
