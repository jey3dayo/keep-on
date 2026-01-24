import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl',
        secondary: 'bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90',
        outline:
          'border-2 border-primary bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 rounded-md px-4 text-xs',
        lg: 'h-14 rounded-md px-8 text-base',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  children: React.ReactNode
}

export function Button({ variant, size, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} type={type} {...props}>
      {children}
    </button>
  )
}
