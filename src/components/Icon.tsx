import {
  Apple,
  Ban,
  Bed,
  Bike,
  BookOpen,
  Brain,
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
  Pencil,
  Pill,
  Plus,
  Power,
  Settings,
  Smile,
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
  | 'pencil'
  | 'pill'
  | 'plus'
  | 'power'
  | 'settings'
  | 'smile'
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
  pencil: Pencil,
  pill: Pill,
  plus: Plus,
  power: Power,
  settings: Settings,
  smile: Smile,
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
  return 'circle-check' // デフォルトアイコン
}

export function Icon({ name, ...props }: IconProps): React.JSX.Element {
  const Component = icons[name]
  return <Component {...props} />
}
