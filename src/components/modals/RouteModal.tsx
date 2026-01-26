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
      router.back()
    }
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={true}>
      <SheetContent className="h-[90vh] sm:mx-auto sm:h-auto sm:max-w-xl" side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
