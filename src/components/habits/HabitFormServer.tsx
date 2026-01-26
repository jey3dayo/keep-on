'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Result } from '@praha/byethrow'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createHabit } from '@/app/actions/habits/create'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { formatSerializableError } from '@/lib/errors/serializable'
import { HabitInputSchema, type HabitInputSchemaType } from '@/schemas/habit'

interface HabitFormServerProps {
  onSuccess?: 'close' | 'redirect'
}

export function HabitFormServer({ onSuccess = 'redirect' }: HabitFormServerProps = {}) {
  const router = useRouter()
  const form = useForm<HabitInputSchemaType>({
    resolver: valibotResolver(HabitInputSchema),
    defaultValues: {
      name: '',
      icon: null,
    },
  })

  async function onSubmit(data: HabitInputSchemaType) {
    // FormDataを作成してServer Actionを呼び出し
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.icon?.trim()) {
      formData.append('icon', data.icon)
    }

    const result = await createHabit(formData)

    if (Result.isSuccess(result)) {
      toast.success('習慣を作成しました', {
        description: `「${data.name}」が追加されました`,
      })
      form.reset()

      if (onSuccess === 'close') {
        router.back()
      }
    } else {
      toast.error('習慣の作成に失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>習慣名</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              error={fieldState.invalid}
              id={field.name}
              maxLength={100}
              placeholder="例: 朝の運動"
              type="text"
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="icon"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>アイコン（任意）</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              error={fieldState.invalid}
              id={field.name}
              maxLength={50}
              placeholder="circle-check"
              type="text"
              value={field.value ?? ''}
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Button className="w-full" disabled={form.formState.isSubmitting} size="lg" type="submit">
        {form.formState.isSubmitting ? '作成中...' : '習慣を作成'}
      </Button>
    </form>
  )
}
