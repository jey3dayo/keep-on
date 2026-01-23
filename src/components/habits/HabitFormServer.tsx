'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createHabit } from '@/app/actions/habits'
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
    if (data.emoji) {
      formData.append('emoji', data.emoji)
    }

    const result = await createHabit({ error: null, success: false }, formData)

    if (result.success) {
      setSuccess(true)
      form.reset()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="mb-2 block font-medium text-slate-700 text-sm dark:text-slate-300" htmlFor="habit-name">
          習慣名
        </label>
        <input
          {...form.register('name')}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
          id="habit-name"
          maxLength={100}
          placeholder="例: 朝の運動"
          type="text"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-red-500 text-sm">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-medium text-slate-700 text-sm dark:text-slate-300" htmlFor="habit-emoji">
          絵文字（任意）
        </label>
        <input
          {...form.register('emoji')}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
          id="habit-emoji"
          maxLength={2}
          placeholder="🏃"
          type="text"
        />
        {form.formState.errors.emoji && (
          <p className="mt-1 text-red-500 text-sm">{form.formState.errors.emoji.message}</p>
        )}
      </div>

      {serverError && <p className="text-red-400 text-sm">{serverError}</p>}
      {success && <p className="text-green-400 text-sm">習慣を作成しました！</p>}

      <button
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={form.formState.isSubmitting}
        type="submit"
      >
        {form.formState.isSubmitting ? '作成中...' : '習慣を作成'}
      </button>
    </form>
  )
}
