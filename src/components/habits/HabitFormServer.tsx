'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Result } from '@praha/byethrow'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createHabit } from '@/app/actions/habits/create'
import { Input } from '@/components/Input'
import { formatSerializableError } from '@/lib/errors/serializable'
import { HabitInputSchema, type HabitInputSchemaType } from '@/schemas/habit'

export function HabitFormServer() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<HabitInputSchemaType>({
    resolver: zodResolver(HabitInputSchema),
    defaultValues: {
      name: '',
      emoji: null,
    },
  })

  async function onSubmit(data: HabitInputSchemaType) {
    setServerError(null)
    setSuccess(false)

    // FormDataを作成してServer Actionを呼び出し
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.emoji?.trim()) {
      formData.append('emoji', data.emoji)
    }

    const result = await createHabit(formData)

    if (Result.isSuccess(result)) {
      setSuccess(true)
      form.reset()
    } else {
      // シリアライズされたエラーをユーザー向けメッセージに変換
      setServerError(formatSerializableError(result.error))
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="mb-2 block font-medium text-foreground text-sm" htmlFor="habit-name">
          習慣名
        </label>
        <Input
          {...form.register('name')}
          disablePasswordManagers={true}
          error={!!form.formState.errors.name}
          id="habit-name"
          maxLength={100}
          placeholder="例: 朝の運動"
          type="text"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-destructive text-sm">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-medium text-foreground text-sm" htmlFor="habit-emoji">
          絵文字（任意）
        </label>
        <Input
          {...form.register('emoji')}
          disablePasswordManagers={true}
          error={!!form.formState.errors.emoji}
          id="habit-emoji"
          maxLength={2}
          placeholder="🏃"
          type="text"
        />
        {form.formState.errors.emoji && (
          <p className="mt-1 text-destructive text-sm">{form.formState.errors.emoji.message}</p>
        )}
      </div>

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}
      {success && <p className="text-sm text-success">習慣を作成しました！</p>}

      <button
        className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={form.formState.isSubmitting}
        type="submit"
      >
        {form.formState.isSubmitting ? '作成中...' : '習慣を作成'}
      </button>
    </form>
  )
}
