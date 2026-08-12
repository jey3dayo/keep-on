import type { SVGProps } from 'react'

/**
 * ヘッダー等の UI に埋め込むロゴマーク。
 *
 * public/logo.svg（生成物）はバーが固定色 #4E8794 のため、ダッシュボードの
 * teal 背景では同系色に沈んで見えない。ここではバーを currentColor にして
 * 文脈の文字色（text-foreground 等）を継承させ、背景が teal でも白でも成立させる。
 * チェックマークの色はブランドカラーとして固定。
 *
 * 形状の正本は scripts/generate-logo.mjs。形状を変更したらここも同期すること。
 *
 * viewBox はアイコン全面（120x80）ではなく実形状の bounding box にトリムしている。
 * 全面のままだと `h-5` 指定でも実描画が 6 割程度に縮み、隣のアイコン群より
 * 光学的に小さく・上下中心もずれて見える（ヘッダーで「沈む」原因）。
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="12 16 97 48" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect fill="currentColor" height="11" rx="5.5" width="40" x="13" y="17" />
      <rect fill="currentColor" height="11" rx="5.5" width="50" x="13" y="34.5" />
      <rect fill="currentColor" height="11" rx="5.5" width="40" x="13" y="52" />
      <path d="M69 44 L79 54 L101 26" stroke="#D08A45" strokeLinecap="round" strokeLinejoin="round" strokeWidth="13" />
    </svg>
  )
}
