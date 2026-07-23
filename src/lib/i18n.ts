import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import ja from '@/locales/ja.json'

// Edge Runtime 互換のため、言語検出・非同期ロードは行わずリソースを同期的に埋め込む。
// ja 単一ロケールのみサポート（i18n 対応は将来の拡張余地として基盤のみ用意）。
const i18n = i18next.createInstance()

i18n.use(initReactI18next).init({
  lng: 'ja',
  fallbackLng: 'ja',
  resources: {
    ja: {
      translation: ja,
    },
  },
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
