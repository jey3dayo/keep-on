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
import type { IconName } from '@/components/basics/Icon'
import type { Period } from '@/constants/habit'

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

export const newHabitColors = [
  { id: 'orange', color: 'var(--orange-9)', label: 'オレンジ' },
  { id: 'red', color: 'var(--red-9)', label: 'レッド' },
  { id: 'pink', color: 'var(--pink-9)', label: 'ピンク' },
  { id: 'purple', color: 'var(--purple-9)', label: 'パープル' },
  { id: 'blue', color: 'var(--blue-9)', label: 'ブルー' },
  { id: 'cyan', color: 'var(--cyan-9)', label: 'シアン' },
  { id: 'teal', color: 'var(--teal-9)', label: 'ティール' },
  { id: 'green', color: 'var(--green-9)', label: 'グリーン' },
  { id: 'lime', color: 'var(--lime-9)', label: 'ライム' },
  { id: 'yellow', color: 'var(--yellow-9)', label: 'イエロー' },
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

export interface TaskPeriodOption {
  id: Period
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
  period: Period
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

export type PresetCategory = 'all' | 'health' | 'productivity' | 'lifestyle' | 'learning'

export interface PresetCategoryOption {
  id: PresetCategory
  label: string
  icon: LucideIcon
}

export const presetCategories: PresetCategoryOption[] = [
  { id: 'all', label: 'すべて', icon: Sparkles },
  { id: 'health', label: '健康', icon: Heart },
  { id: 'productivity', label: '生産性', icon: Target },
  { id: 'lifestyle', label: '生活', icon: Coffee },
  { id: 'learning', label: '学習', icon: BookOpen },
]

export interface HabitPreset {
  id: string
  name: string
  iconId: IconName
  colorId: string
  period: Period
  frequency: number
  category: PresetCategory
}

export const habitPresets: HabitPreset[] = [
  {
    id: 'p1',
    name: '水を飲む',
    iconId: 'droplets',
    colorId: 'cyan',
    period: 'daily',
    frequency: 1,
    category: 'health',
  },
  {
    id: 'p2',
    name: '30分運動する',
    iconId: 'dumbbell',
    colorId: 'orange',
    period: 'daily',
    frequency: 1,
    category: 'health',
  },
  {
    id: 'p3',
    name: '5,000歩歩く',
    iconId: 'footprints',
    colorId: 'green',
    period: 'daily',
    frequency: 1,
    category: 'health',
  },
  {
    id: 'p4',
    name: 'ビタミン剤を飲む',
    iconId: 'pill',
    colorId: 'yellow',
    period: 'daily',
    frequency: 1,
    category: 'health',
  },
  {
    id: 'p5',
    name: '7時間以上寝る',
    iconId: 'moon',
    colorId: 'purple',
    period: 'daily',
    frequency: 1,
    category: 'health',
  },
  { id: 'p6', name: '瞑想する', iconId: 'brain', colorId: 'teal', period: 'daily', frequency: 1, category: 'health' },
  {
    id: 'p7',
    name: 'ポモドーロタイマーを使う',
    iconId: 'clock',
    colorId: 'red',
    period: 'daily',
    frequency: 1,
    category: 'productivity',
  },
  {
    id: 'p8',
    name: 'タスクを整理する',
    iconId: 'target',
    colorId: 'blue',
    period: 'daily',
    frequency: 1,
    category: 'productivity',
  },
  {
    id: 'p9',
    name: '週次レビュー',
    iconId: 'target',
    colorId: 'blue',
    period: 'weekly',
    frequency: 1,
    category: 'productivity',
  },
  {
    id: 'p10',
    name: '月の振り返り',
    iconId: 'clock',
    colorId: 'pink',
    period: 'monthly',
    frequency: 1,
    category: 'productivity',
  },
  {
    id: 'p11',
    name: '部屋を整頓する',
    iconId: 'sparkles',
    colorId: 'lime',
    period: 'daily',
    frequency: 1,
    category: 'lifestyle',
  },
  {
    id: 'p12',
    name: '写真を撮る',
    iconId: 'camera',
    colorId: 'pink',
    period: 'daily',
    frequency: 1,
    category: 'lifestyle',
  },
  {
    id: 'p13',
    name: '日記を書く',
    iconId: 'palette',
    colorId: 'purple',
    period: 'daily',
    frequency: 1,
    category: 'lifestyle',
  },
  {
    id: 'p14',
    name: '料理をする',
    iconId: 'apple',
    colorId: 'orange',
    period: 'daily',
    frequency: 1,
    category: 'lifestyle',
  },
  {
    id: 'p15',
    name: '10分間読む',
    iconId: 'book-open',
    colorId: 'purple',
    period: 'daily',
    frequency: 1,
    category: 'learning',
  },
  {
    id: 'p16',
    name: '言語を習う',
    iconId: 'brain',
    colorId: 'blue',
    period: 'daily',
    frequency: 1,
    category: 'learning',
  },
  {
    id: 'p17',
    name: '楽器を練習する',
    iconId: 'music',
    colorId: 'red',
    period: 'daily',
    frequency: 1,
    category: 'learning',
  },
  {
    id: 'p18',
    name: '新しいスキルを学ぶ',
    iconId: 'brain',
    colorId: 'teal',
    period: 'weekly',
    frequency: 1,
    category: 'learning',
  },
]

export function getIconById(id: string) {
  return habitIcons.find((i) => i.id === id) || habitIcons[0]
}

export function getColorById(id: string) {
  return habitColors.find((c) => c.id === id) || habitColors[0]
}

export function getPeriodById(id: Period) {
  return taskPeriods.find((p) => p.id === id) || taskPeriods[0]
}
