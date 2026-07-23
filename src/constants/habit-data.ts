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

interface HabitIcon {
  icon: LucideIcon
  id: IconName
  label: string
}

export const habitIcons: HabitIcon[] = [
  { icon: Droplets, id: 'droplets', label: '水を飲む' },
  { icon: Dumbbell, id: 'dumbbell', label: '運動' },
  { icon: BookOpen, id: 'book-open', label: '読書' },
  { icon: Moon, id: 'moon', label: '睡眠' },
  { icon: Heart, id: 'heart', label: '健康' },
  { icon: Apple, id: 'apple', label: '栄養' },
  { icon: Brain, id: 'brain', label: '瞑想' },
  { icon: Music, id: 'music', label: '音楽' },
  { icon: Camera, id: 'camera', label: '写真' },
  { icon: Palette, id: 'palette', label: 'アート' },
  { icon: Coffee, id: 'coffee', label: 'カフェイン' },
  { icon: Bike, id: 'bike', label: 'サイクリング' },
  { icon: Footprints, id: 'footprints', label: 'ウォーキング' },
  { icon: Pill, id: 'pill', label: '薬' },
  { icon: Clock, id: 'clock', label: '時間管理' },
  { icon: Sparkles, id: 'sparkles', label: 'その他' },
  { icon: Target, id: 'target', label: '目標' },
  { icon: Flame, id: 'flame', label: '連続' },
]

export const habitColors = [
  { color: 'var(--orange-9)', foreground: 'var(--orange-12)', id: 'orange', label: 'オレンジ' },
  { color: 'var(--red-9)', foreground: 'var(--red-12)', id: 'red', label: 'レッド' },
  { color: 'var(--pink-9)', foreground: 'var(--pink-12)', id: 'pink', label: 'ピンク' },
  { color: 'var(--purple-9)', foreground: 'var(--purple-12)', id: 'purple', label: 'パープル' },
  { color: 'var(--blue-9)', foreground: 'var(--blue-12)', id: 'blue', label: 'ブルー' },
  { color: 'var(--cyan-9)', foreground: 'var(--cyan-12)', id: 'cyan', label: 'シアン' },
  { color: 'var(--teal-9)', foreground: 'var(--teal-12)', id: 'teal', label: 'ティール' },
  { color: 'var(--green-9)', foreground: 'var(--green-12)', id: 'green', label: 'グリーン' },
  { color: 'var(--lime-9)', foreground: 'var(--lime-1)', id: 'lime', label: 'ライム' },
  { color: 'var(--yellow-9)', foreground: 'var(--yellow-1)', id: 'yellow', label: 'イエロー' },
]

interface TaskPeriodOption {
  frequencyLabel: string
  id: Period
  label: string
  sublabel: string
}

export const taskPeriods: TaskPeriodOption[] = [
  { frequencyLabel: '回 / 日', id: 'daily', label: 'デイリー', sublabel: '毎日' },
  { frequencyLabel: '回 / 週', id: 'weekly', label: '週次', sublabel: '毎週' },
  { frequencyLabel: '回 / 月', id: 'monthly', label: '月次', sublabel: '毎月' },
]

export type PresetCategory = 'all' | 'health' | 'productivity' | 'lifestyle' | 'learning'

export interface PresetCategoryOption {
  icon: LucideIcon
  id: PresetCategory
  label: string
}

export const presetCategories: PresetCategoryOption[] = [
  { icon: Sparkles, id: 'all', label: 'すべて' },
  { icon: Heart, id: 'health', label: '健康' },
  { icon: Coffee, id: 'lifestyle', label: '生活' },
  { icon: BookOpen, id: 'learning', label: '学習' },
  { icon: Target, id: 'productivity', label: '生産性' },
]

export interface HabitPreset {
  category: PresetCategory
  colorId: string
  frequency: number
  iconId: IconName
  id: string
  name: string
  period: Period
}

export const habitPresets: HabitPreset[] = [
  {
    category: 'health',
    colorId: 'cyan',
    frequency: 8,
    iconId: 'droplets',
    id: 'p1',
    name: '水を飲む',
    period: 'daily',
  },
  {
    category: 'health',
    colorId: 'orange',
    frequency: 1,
    iconId: 'dumbbell',
    id: 'p2',
    name: '30分運動する',
    period: 'daily',
  },
  {
    category: 'health',
    colorId: 'red',
    frequency: 1,
    iconId: 'dumbbell',
    id: 'p19',
    name: '筋トレをする',
    period: 'daily',
  },
  {
    category: 'health',
    colorId: 'green',
    frequency: 1,
    iconId: 'footprints',
    id: 'p3',
    name: '5,000歩歩く',
    period: 'daily',
  },
  {
    category: 'health',
    colorId: 'yellow',
    frequency: 1,
    iconId: 'pill',
    id: 'p4',
    name: 'ビタミン剤を飲む',
    period: 'daily',
  },
  {
    category: 'health',
    colorId: 'purple',
    frequency: 1,
    iconId: 'moon',
    id: 'p5',
    name: '7時間以上寝る',
    period: 'daily',
  },
  { category: 'health', colorId: 'teal', frequency: 1, iconId: 'brain', id: 'p6', name: '瞑想する', period: 'daily' },
  {
    category: 'productivity',
    colorId: 'red',
    frequency: 4,
    iconId: 'clock',
    id: 'p7',
    name: 'ポモドーロタイマーを使う',
    period: 'daily',
  },
  {
    category: 'productivity',
    colorId: 'blue',
    frequency: 1,
    iconId: 'target',
    id: 'p8',
    name: 'タスクを整理する',
    period: 'daily',
  },
  {
    category: 'productivity',
    colorId: 'blue',
    frequency: 1,
    iconId: 'target',
    id: 'p9',
    name: '週次レビュー',
    period: 'weekly',
  },
  {
    category: 'productivity',
    colorId: 'pink',
    frequency: 1,
    iconId: 'clock',
    id: 'p10',
    name: '月の振り返り',
    period: 'monthly',
  },
  {
    category: 'lifestyle',
    colorId: 'lime',
    frequency: 1,
    iconId: 'sparkles',
    id: 'p11',
    name: '部屋を整頓する',
    period: 'daily',
  },
  {
    category: 'lifestyle',
    colorId: 'pink',
    frequency: 3,
    iconId: 'camera',
    id: 'p12',
    name: '写真を撮る',
    period: 'daily',
  },
  {
    category: 'lifestyle',
    colorId: 'purple',
    frequency: 1,
    iconId: 'palette',
    id: 'p13',
    name: '日記を書く',
    period: 'daily',
  },
  {
    category: 'lifestyle',
    colorId: 'orange',
    frequency: 2,
    iconId: 'apple',
    id: 'p14',
    name: '料理をする',
    period: 'daily',
  },
  {
    category: 'learning',
    colorId: 'purple',
    frequency: 2,
    iconId: 'book-open',
    id: 'p15',
    name: '10分間読む',
    period: 'daily',
  },
  {
    category: 'learning',
    colorId: 'blue',
    frequency: 1,
    iconId: 'brain',
    id: 'p16',
    name: '言語を習う',
    period: 'daily',
  },
  {
    category: 'learning',
    colorId: 'red',
    frequency: 1,
    iconId: 'music',
    id: 'p17',
    name: '楽器を練習する',
    period: 'daily',
  },
  {
    category: 'learning',
    colorId: 'teal',
    frequency: 3,
    iconId: 'brain',
    id: 'p18',
    name: '新しいスキルを学ぶ',
    period: 'weekly',
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
