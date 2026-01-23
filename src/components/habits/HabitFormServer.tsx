'use client'

import { useActionState, useEffect } from 'react'
import { createHabit } from '@/app/actions/habits'

const initialState: { error: string | null; success: boolean } = { error: null, success: false }

export function HabitFormServer() {
  const [state, formAction, isPending] = useActionState(createHabit, initialState)

  useEffect(() => {
    if (state.success) {
      // フォームをリセット
      const form = document.getElementById('habit-form') as HTMLFormElement
      form?.reset()
    }
  }, [state.success])

  return (
    <form id="habit-form" action={formAction} className="space-y-4">
      <div>
        <label className="mb-2 block font-medium text-slate-700 text-sm dark:text-slate-300" htmlFor="habit-name">
          習慣名
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
          id="habit-name"
          maxLength={100}
          name="name"
          placeholder="例: 朝の運動"
          required
          type="text"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium text-slate-700 text-sm dark:text-slate-300" htmlFor="habit-emoji">
          絵文字（任意）
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
          id="habit-emoji"
          maxLength={2}
          name="emoji"
          placeholder="🏃"
          type="text"
        />
      </div>

      {state?.error && <p className="text-red-400 text-sm">{state.error}</p>}
      {state?.success && <p className="text-green-400 text-sm">習慣を作成しました！</p>}

      <button
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? '作成中...' : '習慣を作成'}
      </button>
    </form>
  )
}
