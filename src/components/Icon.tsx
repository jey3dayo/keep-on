import {
  Apple,
  Ban,
  Bed,
  Bike,
  BookOpen,
  Brain,
  Camera,
  Check,
  CircleCheck,
  Clock,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  HelpCircle,
  Home,
  Info,
  type LucideProps,
  Mail,
  Menu,
  Moon,
  Music,
  Palette,
  Pencil,
  Pill,
  Plus,
  Power,
  Settings,
  Smile,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trash2,
  Users,
} from 'lucide-react'

export type IconName =
  | 'apple'
  | 'ban'
  | 'bed'
  | 'bike'
  | 'book-open'
  | 'brain'
  | 'camera'
  | 'check'
  | 'circle-check'
  | 'clock'
  | 'coffee'
  | 'droplets'
  | 'dumbbell'
  | 'flame'
  | 'footprints'
  | 'heart'
  | 'help-circle'
  | 'home'
  | 'info'
  | 'mail'
  | 'menu'
  | 'moon'
  | 'music'
  | 'palette'
  | 'pencil'
  | 'pill'
  | 'plus'
  | 'power'
  | 'settings'
  | 'smile'
  | 'sparkles'
  | 'sun'
  | 'target'
  | 'timer'
  | 'trash'
  | 'users'

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  apple: Apple,
  ban: Ban,
  bed: Bed,
  bike: Bike,
  'book-open': BookOpen,
  brain: Brain,
  camera: Camera,
  check: Check,
  'circle-check': CircleCheck,
  clock: Clock,
  coffee: Coffee,
  droplets: Droplets,
  dumbbell: Dumbbell,
  flame: Flame,
  footprints: Footprints,
  heart: Heart,
  'help-circle': HelpCircle,
  home: Home,
  info: Info,
  mail: Mail,
  menu: Menu,
  moon: Moon,
  music: Music,
  palette: Palette,
  pencil: Pencil,
  pill: Pill,
  plus: Plus,
  power: Power,
  settings: Settings,
  smile: Smile,
  sparkles: Sparkles,
  sun: Sun,
  target: Target,
  timer: Timer,
  trash: Trash2,
  users: Users,
}

export type IconProps = LucideProps & {
  name: IconName
}

/**
 * 有効なIconNameかチェックする型ガード
 */
export function isValidIconName(name: unknown): name is IconName {
  return typeof name === 'string' && name in icons
}

/**
 * 無効なアイコン名をデフォルト値にフォールバックする
 */
export function normalizeIconName(name: unknown): IconName {
  if (isValidIconName(name)) {
    return name
  }
  if (typeof name === 'string') {
    const legacyIconMap: Record<string, IconName> = {
      water: 'droplets',
      exercise: 'dumbbell',
      read: 'book-open',
      sleep: 'moon',
      health: 'heart',
      nutrition: 'apple',
      meditate: 'brain',
      photo: 'camera',
      art: 'palette',
      walk: 'footprints',
      medicine: 'pill',
      time: 'clock',
      sparkle: 'sparkles',
      goal: 'target',
      streak: 'flame',
    }

    const mapped = legacyIconMap[name]
    if (mapped) {
      return mapped
    }
  }
  return 'circle-check' // デフォルトアイコン
}

export function Icon({ name, ...props }: IconProps): React.JSX.Element {
  const Component = icons[name]
  return <Component {...props} />
}
