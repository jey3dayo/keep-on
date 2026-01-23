'use client'

import { useState } from 'react'

interface HabitFormProps {
  onSuccess?: () => void
}

export function HabitForm({ onSuccess }: HabitFormProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji: emoji || undefined }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create habit')
      }

      setName('')
      setEmoji('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block font-medium text-slate-300 text-sm" htmlFor="habit-name">
          習慣名
        </label>
        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="habit-name"
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 朝の運動"
          required
          type="text"
          value={name}
        />
      </div>

      <div>
        <label className="mb-2 block font-medium text-slate-300 text-sm" htmlFor="habit-emoji">
          絵文字（任意）
        </label>
        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="habit-emoji"
          maxLength={2}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🏃"
          type="text"
          value={emoji}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || !name.trim()}
        type="submit"
      >
        {isLoading ? '作成中...' : '習慣を作成'}
      </button>
    </form>
  )
}
