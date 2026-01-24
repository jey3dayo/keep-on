import { Check, Home, Info, type LucideProps, Mail, Menu, Moon, Plus, Power, Sun, Trash2 } from 'lucide-react'

export type IconName = 'check' | 'home' | 'info' | 'mail' | 'menu' | 'moon' | 'plus' | 'power' | 'sun' | 'trash'

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  check: Check,
  home: Home,
  info: Info,
  mail: Mail,
  menu: Menu,
  moon: Moon,
  plus: Plus,
  power: Power,
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
