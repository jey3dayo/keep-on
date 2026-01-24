import { Check, type LucideProps, Moon, Plus, Sun, Trash2 } from 'lucide-react'

export type IconName = 'check' | 'moon' | 'plus' | 'sun' | 'trash'

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  check: Check,
  moon: Moon,
  plus: Plus,
  sun: Sun,
  trash: Trash2,
}

export type IconProps = LucideProps & {
  name: IconName
}

export function Icon({ name, ...props }: IconProps): React.JSX.Element {
  const Component = icons[name]
  return <Component {...props} />
}
