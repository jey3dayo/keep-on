import i18next from 'i18next'
import ja from '@/locales/ja.json'

// Server Component から使う i18n。react-i18next を import すると
// RSC のサーバーチャンクに createContext が混入してビルドが壊れるため、react バインディングなしで初期化する
const i18n = i18next.createInstance()

i18n.init({
  fallbackLng: 'ja',
  interpolation: {
    escapeValue: false,
  },
  lng: 'ja',
  resources: {
    ja: {
      translation: ja,
    },
  },
})

export default i18n
