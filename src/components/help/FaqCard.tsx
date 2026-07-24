'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

export function FaqCard({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', open && 'bg-muted/30')}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex w-full cursor-pointer list-none items-center justify-between gap-3 text-left font-semibold text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>Q. {question}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition duration-200 ease-out motion-reduce:transition-none',
            open && 'rotate-180'
          )}
        />
      </button>
      <div className="faq-answer" data-open={open ? 'true' : undefined} id={panelId}>
        <div>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">A. {answer}</p>
        </div>
      </div>
    </div>
  )
}
