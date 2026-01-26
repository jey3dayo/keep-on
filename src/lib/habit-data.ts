import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Camera,
  Clock,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  type LucideIcon,
  Moon,
  Music,
  Palette,
  Pill,
  Sparkles,
  Target,
} from 'lucide-react'
import type { IconName } from '@/components/Icon'

export interface HabitIcon {
  id: IconName
  icon: LucideIcon
  label: string
}

export const habitIcons: HabitIcon[] = [
  { id: 'droplets', icon: Droplets, label: '水を飲む' },
  { id: 'dumbbell', icon: Dumbbell, label: '運動' },
  { id: 'book-open', icon: BookOpen, label: '読書' },
  { id: 'moon', icon: Moon, label: '睡眠' },
  { id: 'heart', icon: Heart, label: '健康' },
  { id: 'apple', icon: Apple, label: '栄養' },
  { id: 'brain', icon: Brain, label: '瞑想' },
  { id: 'music', icon: Music, label: '音楽' },
  { id: 'camera', icon: Camera, label: '写真' },
  { id: 'palette', icon: Palette, label: 'アート' },
  { id: 'coffee', icon: Coffee, label: 'カフェイン' },
  { id: 'bike', icon: Bike, label: 'サイクリング' },
  { id: 'footprints', icon: Footprints, label: 'ウォーキング' },
  { id: 'pill', icon: Pill, label: '薬' },
  { id: 'clock', icon: Clock, label: '時間管理' },
  { id: 'sparkles', icon: Sparkles, label: 'その他' },
  { id: 'target', icon: Target, label: '目標' },
  { id: 'flame', icon: Flame, label: '連続' },
]

export const habitColors = [
  { id: 'orange', color: 'oklch(0.70 0.18 45)', label: 'オレンジ' },
  { id: 'red', color: 'oklch(0.65 0.22 25)', label: 'レッド' },
  { id: 'pink', color: 'oklch(0.70 0.18 350)', label: 'ピンク' },
  { id: 'purple', color: 'oklch(0.65 0.20 300)', label: 'パープル' },
  { id: 'blue', color: 'oklch(0.65 0.18 250)', label: 'ブルー' },
  { id: 'cyan', color: 'oklch(0.75 0.14 200)', label: 'シアン' },
  { id: 'teal', color: 'oklch(0.70 0.14 175)', label: 'ティール' },
  { id: 'green', color: 'oklch(0.70 0.18 145)', label: 'グリーン' },
  { id: 'lime', color: 'oklch(0.80 0.18 125)', label: 'ライム' },
  { id: 'yellow', color: 'oklch(0.85 0.16 95)', label: 'イエロー' },
]

export type TaskPeriod = 'daily' | 'weekly' | 'monthly'

export interface TaskPeriodOption {
  id: TaskPeriod
  label: string
  sublabel: string
  frequencyLabel: string
}

export const taskPeriods: TaskPeriodOption[] = [
  { id: 'daily', label: 'デイリー', sublabel: '毎日', frequencyLabel: '回 / 日' },
  { id: 'weekly', label: '週次', sublabel: '毎週', frequencyLabel: '回 / 週' },
  { id: 'monthly', label: '月次', sublabel: '毎月', frequencyLabel: '回 / 月' },
]

export interface Habit {
  id: string
  name: string
  iconId: string
  colorId: string
  period: TaskPeriod
  frequency: number
  streak: number
  currentProgress: number
  createdAt: Date
}

export const sampleHabits: Habit[] = [
  {
    id: '1',
    name: '水を8杯飲む',
    iconId: 'droplets',
    colorId: 'cyan',
    period: 'daily',
    frequency: 8,
    streak: 12,
    currentProgress: 5,
    createdAt: new Date(),
  },
  {
    id: '2',
    name: '30分運動する',
    iconId: 'dumbbell',
    colorId: 'orange',
    period: 'daily',
    frequency: 1,
    streak: 7,
    currentProgress: 1,
    createdAt: new Date(),
  },
  {
    id: '3',
    name: '読書',
    iconId: 'book-open',
    colorId: 'purple',
    period: 'daily',
    frequency: 1,
    streak: 5,
    currentProgress: 0,
    createdAt: new Date(),
  },
  {
    id: '4',
    name: '瞑想する',
    iconId: 'brain',
    colorId: 'teal',
    period: 'daily',
    frequency: 1,
    streak: 21,
    currentProgress: 1,
    createdAt: new Date(),
  },
  {
    id: '5',
    name: '週次レビュー',
    iconId: 'target',
    colorId: 'blue',
    period: 'weekly',
    frequency: 1,
    streak: 4,
    currentProgress: 0,
    createdAt: new Date(),
  },
  {
    id: '6',
    name: '月の振り返り',
    iconId: 'clock',
    colorId: 'pink',
    period: 'monthly',
    frequency: 1,
    streak: 3,
    currentProgress: 0,
    createdAt: new Date(),
  },
]

export function getIconById(id: string) {
  return habitIcons.find((i) => i.id === id) || habitIcons[0]
}

export function getColorById(id: string) {
  return habitColors.find((c) => c.id === id) || habitColors[0]
}

export function getPeriodById(id: TaskPeriod) {
  return taskPeriods.find((p) => p.id === id) || taskPeriods[0]
}

/**
 * 習慣を期間でフィルタリング
 *
 * @param habits - フィルタリング対象の習慣配列
 * @param periodFilter - フィルター条件（'all' | TaskPeriod）
 * @returns フィルタリングされた習慣配列
 */
export function filterHabitsByPeriod<T extends { period: TaskPeriod }>(
  habits: T[],
  periodFilter: 'all' | TaskPeriod
): T[] {
  return periodFilter === 'all' ? habits : habits.filter((h) => h.period === periodFilter)
}
