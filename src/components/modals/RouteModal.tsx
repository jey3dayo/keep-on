'use client'

import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface RouteModalProps {
  title: string
  children: React.ReactNode
}

export function RouteModal({ title, children }: RouteModalProps) {
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
      <SheetContent className="mt-2 h-[90vh] p-6 sm:mx-auto sm:h-auto sm:max-w-xl" side="bottom">
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="flex-shrink-0 pb-2">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="-mx-6 flex-1 overflow-y-auto overflow-x-hidden px-6">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
