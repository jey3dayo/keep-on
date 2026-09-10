import type { ReactNode } from 'react'

/**
 * 月グリッドの1セル分の描画内容。`key` は React の配列 key として使う dateKey、
 * `content` は呼び出し側（HabitCalendarHeatmap）が組み立てた CalendarCell + 説明用 span。
 */
export interface HabitCalendarGridCellData {
  content: ReactNode
  key: string
}

interface HabitCalendarGridStructureProps {
  keyboardInstructionsId: string
  monthHeadingId: string
  weekdayLabels: string[]
  weekRows: HabitCalendarGridCellData[][]
}

/**
 * 月グリッドの構造マークアップ（`role="grid"` / `"row"` / `"columnheader"` / `"gridcell"`）だけを
 * 切り出したプレゼンテーション専用コンポーネント。
 *
 * WAI-ARIA APG の grid パターンでは、これらは構造上のロールでありフォーカス先ではない。
 * セルが単一のウィジェット（`HabitCalendarHeatmap.tsx` の `CalendarCell`、実体は button）を
 * 含む場合、フォーカスはそのウィジェットへ委譲され、複合ウィジェット全体でページの Tab 順序に
 * 含まれるフォーカス可能要素は1つだけになる（roving tabindex はセル内の button 側で管理する）。
 * biome の a11y/useFocusableInteractive はこの「フォーカスが子要素へ委譲される」パターンを
 * 認識せず、構造用の role にも tabIndex を要求してしまうため誤検知になる。
 *
 * この誤検知の抑制（biome.jsonc の scoped override）を、ロジック（roving tabindex の state・
 * キーハンドラ・セルの描画）を持つ `HabitCalendarHeatmap.tsx` 全体ではなく、構造マークアップだけを
 * 持つこのファイルに限定するために分離している。セルの中身（`content`）は呼び出し側が
 * 組み立てて渡すため、このファイルは role の割り当てとレイアウトのみに責務を絞っている。
 */
export function HabitCalendarGridStructure({
  keyboardInstructionsId,
  monthHeadingId,
  weekRows,
  weekdayLabels,
}: HabitCalendarGridStructureProps) {
  return (
    <div aria-describedby={keyboardInstructionsId} aria-labelledby={monthHeadingId} className="space-y-2" role="grid">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1" role="row">
        {weekdayLabels.map((label) => (
          <div className="text-center text-muted-foreground text-xs" key={label} role="columnheader">
            {label}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="space-y-1">
        {weekRows.map((week, wi) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable week index
          <div className="grid grid-cols-7 gap-1" key={wi} role="row">
            {week.map((cell) => (
              <div key={cell.key} role="gridcell">
                {cell.content}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
