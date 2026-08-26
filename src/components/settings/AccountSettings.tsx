'use client'

import { HelpCircle, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/basics/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signOut } from '@/lib/auth/sign-out'

export function AccountSettings({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>その他</CardTitle>
        <CardDescription>ヘルプの確認や、現在のアカウントからサインアウトできます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          className="w-full justify-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
          size="lg"
          type="button"
          variant="outline"
        >
          <LogOut aria-hidden="true" className="size-4" />
          サインアウト
        </Button>
        <Button asChild className="w-full justify-start" size="lg" variant="outline">
          <Link href="/help" prefetch={false}>
            <HelpCircle aria-hidden="true" className="size-4" />
            ヘルプ
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
