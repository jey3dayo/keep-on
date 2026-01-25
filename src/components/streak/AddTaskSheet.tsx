'use client'

import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { IconPicker } from './IconPicker'

interface AddTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, icon: IconName) => void
}

interface Preset {
  name: string
  icon: IconName
}

const presets: Preset[] = [
  { name: 'ビタミン剤を飲む', icon: 'pill' },
  { name: '5,000歩歩く', icon: 'footprints' },
  { name: '10分間読む', icon: 'book-open' },
  { name: '瞑想する', icon: 'brain' },
  { name: '8時間睡眠', icon: 'bed' },
  { name: 'コーヒーを控える', icon: 'coffee' },
  { name: '水を飲む', icon: 'droplets' },
]

export function AddTaskSheet({ open, onOpenChange, onSubmit }: AddTaskSheetProps) {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState<IconName>('circle-check')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim(), selectedIcon)
      setName('')
      setSelectedIcon('circle-check')
      onOpenChange(false)
    }
  }

  const handlePresetClick = (preset: Preset) => {
    setName(preset.name)
    setSelectedIcon(preset.icon)
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="h-[90vh] overflow-y-auto" side="bottom">
        <SheetHeader>
          <SheetTitle>新しいタスクを追加</SheetTitle>
          <SheetDescription>習慣にしたいタスクの名前とアイコンを選択してください</SheetDescription>
        </SheetHeader>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-name">タスク名</Label>
            <Input
              autoFocus
              id="task-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 毎日ヨガをする"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label>アイコンを選択</Label>
            <IconPicker onIconSelect={setSelectedIcon} selectedIcon={selectedIcon} />
          </div>

          <div className="space-y-2">
            <Label>プリセット</Label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  className="justify-start"
                  key={preset.name}
                  onClick={() => handlePresetClick(preset)}
                  type="button"
                  variant="outline"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <Button className="w-full" disabled={!name.trim()} type="submit">
            追加
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
