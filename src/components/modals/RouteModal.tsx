'use client'

import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface RouteModalProps {
  children: React.ReactNode
  compact?: boolean
  title?: string
}

export function RouteModal({ title, children, compact }: RouteModalProps) {
  const router = useRouter()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // 履歴がない場合（直接アクセス）はダッシュボードにリダイレクト
      if (window.history.length <= 1) {
        router.push('/dashboard')
      } else {
        router.back()
      }
    }
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={true}>
      <SheetContent
        className={cn(
          'mt-2 h-[90vh] sm:mx-auto sm:h-[85vh] sm:max-w-xl',
          compact ? 'overflow-hidden p-0 [&>button:first-child]:hidden' : 'p-6'
        )}
        side="bottom"
      >
        <div className="flex h-full flex-col overflow-hidden">
          {compact ? (
            <SheetTitle className="sr-only">{title ?? '習慣を追加'}</SheetTitle>
          ) : (
            title && (
              <SheetHeader className="flex-shrink-0 pb-2">
                <SheetTitle>{title}</SheetTitle>
              </SheetHeader>
            )
          )}
          <div className={cn('flex-1 overflow-y-auto overflow-x-hidden', !compact && '-mx-6 px-6')}>{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
