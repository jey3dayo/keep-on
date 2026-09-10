'use client'

import { createId } from '@paralleldrive/cuid2'
import { addDays, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { clearCheckinAction } from '@/app/actions/habits/clear-checkin'
import { removeSkipAction } from '@/app/actions/habits/skip'
import type { Period, WeekStartDay } from '@/constants/habit'
import { formatSerializableError, type SerializableHabitError } from '@/lib/errors/serializable'
import { getPeriodDateRange } from '@/lib/queries/period'
import { cn } from '@/lib/utils'
import { formatDateKey, isDateKeyWithinWindow, parseDateKey } from '@/lib/utils/date'
import { appToast } from '@/lib/utils/toast'
import { type HabitCalendarGridCellData, HabitCalendarGridStructure } from './HabitCalendarGridStructure'

interface HabitCalendarHeatmapProps {
  accentColor: string
  /** アーカイブ済みの習慣はサーバー側で操作が拒否されるため、セルのタップも無効化する */
  archived?: boolean
  checkinCounts: Map<string, number>
  frequency: number
  habitId: string
  months?: number
  /**
   * frequency の上限は日別ではなく期間単位（daily/weekly/monthly）で強制される
   * （`createCheckinWithLimit` 参照）。期間合計を求めるために必要。省略時は 'daily'
   * （期間合計＝日別カウントなので、period を持たない旧来の呼び出しと同じ挙動になる）
   */
  period?: Period
  skipDates?: string[]
  /**
   * サーバーで算出した「今日」の dateKey（dayStartHour 考慮済み）。
   * client の `new Date()` を使うと記録先（サーバー算出の dateKey）と today 判定がズレる。
   */
  todayDateKey: string
  /** 週次期間の起算曜日。省略時は月曜始まり（`DEFAULT_WEEK_START` と同じ既定） */
  weekStartDay?: WeekStartDay
}

interface DayCell {
  count: number
  date: Date
  dateKey: string
  isCurrentMonth: boolean
  isFuture: boolean
  isSkip: boolean
}

/**
 * 同一 dateKey へのタップをキューへ積んだときに実行する1件の操作。
 *
 * 「確定値（サーバー snapshot）＋ 未確定操作列」という表示モデル（後述）における
 * 未確定操作そのもの。delta（+1/-1）ではなく操作の種類だけを持つ。これにより
 * clear（0 にリセット）を挟んでも、他の未確定操作の解釈に影響を与えない
 * （delta 方式だと `-1` のようなロールバックが `clear` と非可換になり、
 *  操作の順序次第で最終表示が壊れる問題があった）。
 */
interface PendingOp {
  id: string
  kind: 'add' | 'clear' | 'removeSkip'
}

/**
 * サーバー呼び出し1回（performAdd/performClear/performRemoveSkip）の結果。
 *
 * runTask が「再同期（サーバーへの refresh）を起動すべきか」を判断するために、
 * 失敗を書き込みの有無で区別する:
 *
 * - `rejected`: 書き込みが起きていないことが確定している Server Action エラー
 *   （どの error name がこれに該当するか、なぜ確定できるかは `classifyActionErrorReason`
 *   を参照）。
 * - `limitReached`: `addCheckinAction` が `created:false` を返した（期間 frequency
 *   上限）。これも書き込みが起きていないことが確定している。
 * - `unknown`: `DatabaseError`。ミューテーション実行中の例外を包む汎用ケースで、
 *   実際には書き込みが成功した後に応答だけが失敗した可能性を排除できない。
 * - `exception`: Server Action 呼び出し自体が例外を投げた（通信断・タイムアウト等）。
 *   `unknown` と同様、書き込みが起きたかどうか分からない。
 *
 * `rejected` / `limitReached` はサーバーとクライアントの間に食い違いを生まないため
 * 再同期は不要、`unknown` / `exception` は食い違いの可能性があるため再同期が必要、
 * という判断に使う。
 */
type PerformResult =
  | { ok: true }
  | { ok: false; reason: 'exception' }
  | { ok: false; reason: 'limitReached' }
  | { error: SerializableHabitError; ok: false; reason: 'rejected' }
  | { error: SerializableHabitError; ok: false; reason: 'unknown' }

/**
 * Server Action のエラーを「書き込みが起きていないと確定している（rejected）」か
 * 「書き込みが起きたかどうか分からない（unknown）」かに分類する。
 *
 * `DatabaseError` はミューテーション実行中の例外を包む汎用ケースであるため、
 * 応答が失敗しても実際には書き込みが成功している可能性を排除できない（unknown）。
 * それ以外の error name（UnauthorizedError / AuthorizationError / ValidationError /
 * NotFoundError）は、書き込みが起きていないことが確定した状態でのみ返る（rejected）。
 * 認証・認可・入力検証・habit lookup のようにミューテーション前に拒否する経路に加え、
 * `createCheckinWithLimit`（`src/lib/queries/checkin.ts`）の opId 衝突検出のように
 * 挿入が起きなかったことを確認したうえで投げる事後検証の経路も含む。
 */
function classifyActionErrorReason(error: SerializableHabitError): 'rejected' | 'unknown' {
  return error.name === 'DatabaseError' ? 'unknown' : 'rejected'
}

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const EMPTY_SKIP_DATES: string[] = []
const CHECKIN_ADD_ERROR_MESSAGE = 'チェックインの追加に失敗しました'
const CHECKIN_CLEAR_ERROR_MESSAGE = 'チェックインの削除に失敗しました'
const SKIP_REMOVE_ERROR_MESSAGE = 'スキップの解除に失敗しました'
const CHECKIN_LIMIT_REACHED_MESSAGE = 'この期間のチェックイン上限に達しています'
// runTask の catch（例外時）で操作種別ごとのエラーメッセージを選ぶための対応表。
// ネストした三項演算子を避けるためのルックアップ。
const ERROR_MESSAGE_BY_KIND: Record<PendingOp['kind'], string> = {
  add: CHECKIN_ADD_ERROR_MESSAGE,
  clear: CHECKIN_CLEAR_ERROR_MESSAGE,
  removeSkip: SKIP_REMOVE_ERROR_MESSAGE,
}
// タップ成功後にサーバー状態（同一画面の統計カード等）を取り込むリフレッシュのデバウンス時間。
// `.claude/rules/optimistic-updates.md` の scheduleRefresh パターンに倣う
const REFRESH_DEBOUNCE_MS = 500
// 全削除の undo トーストを表示しておく時間。ユーザーが気づいて「取り消す」を押す余裕を持たせる
const CLEAR_UNDO_TOAST_DURATION_MS = 8000
// grid 全体で共有するキーボード操作説明の id（各月の role="grid" から aria-describedby で参照）
const KEYBOARD_INSTRUCTIONS_ID = 'habit-calendar-keyboard-instructions'
// ←/→ で月内の前後の日を探索する際の最大試行回数（月は最大31日なので余裕を持たせる）
const MAX_DAY_SEARCH_STEPS = 40
// ↑/↓ で同じ曜日の前後の週を探索する際の最大試行回数（月は最大6週）
const MAX_WEEK_SEARCH_STEPS = 6

function getCheckinColor(count: number, frequency: number, accentColor: string): string {
  const ratio = Math.min(count / frequency, 1)
  // 30% → 100% の範囲でグラデーション
  const pct = Math.round(30 + ratio * 70)
  return `color-mix(in srgb, ${accentColor} ${pct}%, transparent)`
}

function getLegendSteps(frequency: number): number[] {
  const safeFrequency = Math.max(frequency, 1)
  return Array.from(new Set([1, Math.ceil(safeFrequency / 2), safeFrequency])).sort((a, b) => a - b)
}

function getCellStyle(cell: DayCell, accentColor: string, frequency: number) {
  // チェックインとスキップは排他ではない（チェックイン後にスキップした日が実際に発生しうる。
  // 詳細は enqueueTap 付近のコメント参照）。count > 0 かつ isSkip のセルは、どちらの状態も
  // 見た目から読み取れるよう、チェックインの背景色とスキップの破線枠を両方適用する。
  if (cell.count > 0) {
    return {
      backgroundColor: getCheckinColor(cell.count, frequency, accentColor),
      ...(cell.isSkip ? { border: `2px dashed ${accentColor}` } : {}),
    }
  }
  if (cell.isSkip) {
    return {
      backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
      border: `2px dashed ${accentColor}`,
    }
  }
}

function getCellTitle(cell: DayCell, frequency: number): string {
  if (cell.count > 0) {
    return cell.isSkip
      ? `${cell.dateKey} ${cell.count}/${frequency}回・スキップ`
      : `${cell.dateKey} ${cell.count}/${frequency}回`
  }
  if (cell.isSkip) {
    return `${cell.dateKey} スキップ`
  }
  return cell.dateKey
}

/**
 * スクリーンリーダー向けの `aria-label`。マウス向けの `title`（`getCellTitle`）とは別に、
 * 「年を省略しない自然言語の日付＋現在の状態のみ」の文字列を作る。次の操作（追加/削除/
 * スキップ解除）はここに含めない（`aria-describedby` 側の責務。`getCellDescriptionText` 参照）。
 *
 * 月外の padding セル（同じ日付が隣接月のグリッドにも重複して現れる）は、操作対象になり得ず
 * 状態を持たないため、日付のみを返す（冗長な状態説明を足さない）。
 */
function getCellAriaLabel(cell: DayCell, frequency: number): string {
  const dateLabel = format(cell.date, 'yyyy年M月d日', { locale: ja })
  if (!cell.isCurrentMonth) {
    return dateLabel
  }
  if (cell.isSkip && cell.count === 0) {
    return `${dateLabel}、スキップ`
  }
  if (cell.isSkip) {
    return `${dateLabel}、目標${frequency}回中${cell.count}回、スキップ`
  }
  if (cell.count === 0) {
    return `${dateLabel}、記録なし`
  }
  return `${dateLabel}、目標${frequency}回中${cell.count}回`
}

/**
 * 無効セル（タップ不可）の理由を、入力方法に依存しない短い文で返す。`isCellTapDisabled` と
 * 同じ優先順位（isFuture → archived → 許容ウィンドウ外）で判定する。月外の padding セルは
 * 操作対象になり得ないため対象外（null）。
 */
function getCellDisabledReason(cell: DayCell, archived: boolean, todayDateKey: string): string | null {
  if (!cell.isCurrentMonth) {
    return null
  }
  if (cell.isFuture) {
    return '未来の日付のため操作できません'
  }
  if (archived) {
    return 'この習慣はアーカイブ済みのため操作できません'
  }
  if (!isDateKeyWithinWindow(cell.dateKey, todayDateKey)) {
    return '許容期間外のため操作できません'
  }
  return null
}

/**
 * 有効セルの「次の操作」を、入力方法に依存しない表現（「タップで〜」と書かない）で返す。
 * `enqueueTap` と同じ優先順位（isSkip を最優先）で判定する。
 * `isPeriodFull` は呼び出し元が期間合計（daily/weekly/monthly）から算出したもの。
 * 破壊的な操作（全削除）は件数を含めることで、実行前に影響範囲が分かるようにする。
 */
function getCellActionDescription(cell: DayCell, isPeriodFull: boolean): string {
  if (cell.isSkip) {
    return 'スキップを解除'
  }
  if (cell.count > 0 && isPeriodFull) {
    return `この日の${cell.count}件を削除`
  }
  return '追加'
}

/**
 * セルの `aria-describedby` が参照する説明文。無効セルは理由、有効セルは次の操作を返す。
 * 月外の padding セルは対象外（null）。
 */
function getCellDescriptionText(
  cell: DayCell,
  archived: boolean,
  todayDateKey: string,
  isPeriodFull: boolean
): string | null {
  if (!cell.isCurrentMonth) {
    return null
  }
  const disabledReason = getCellDisabledReason(cell, archived, todayDateKey)
  if (disabledReason) {
    return disabledReason
  }
  return getCellActionDescription(cell, isPeriodFull)
}

interface SelectedDateInfo {
  /** 上限到達・スキップ中など、次のタップが何を意味するかのヒント文言 */
  hint: string
  /** `${M月d日}の情報` に続く達成状況の本文 */
  primary: string
}

/**
 * カレンダー外に表示する「選択中の日」の情報テキストを組み立てる。
 * セル自体（CalendarCell）の見た目・aria-label は変更せず、この表示専用のテキストを別途導出する。
 *
 * `isPeriodFull`（選択日が属する期間の合計が frequency 以上か）は enqueueTap の kind 決定と
 * 同じ規則を使う。日別カウントだけで「上限到達＝削除」と判定すると、週次・月次でチェックインが
 * 複数日に散っている場合に、実際にはタップしても add が試みられる（サーバーに拒否される）のに
 * 「次のタップで削除されます」と誤って案内してしまう。
 */
function getSelectedDateInfo(
  dateKey: string,
  count: number,
  isSkip: boolean,
  frequency: number,
  isPeriodFull: boolean
): SelectedDateInfo {
  const dateLabel = format(parseDateKey(dateKey), 'M月d日', { locale: ja })

  if (isSkip && count === 0) {
    return {
      hint: 'タップでスキップを解除',
      primary: `${dateLabel}の情報: スキップ`,
    }
  }

  // count > 0 かつ isSkip（チェックイン後にスキップした日）は、enqueueTap がスキップ解除を
  // 優先するため、次のタップの意味は「上限到達なら削除」ではなく常に「スキップ解除」になる
  if (isSkip) {
    return {
      hint: 'タップでスキップを解除',
      primary: `${dateLabel}の情報: ${count}/${frequency}回・スキップ`,
    }
  }

  if (count > 0 && isPeriodFull) {
    return {
      hint: '上限に達しています。次のタップで削除されます',
      primary: `${dateLabel}の情報: ${count}/${frequency}回`,
    }
  }

  return {
    hint: 'タップで追加',
    primary: `${dateLabel}の情報: ${count}/${frequency}回`,
  }
}

/**
 * セルのタップを無効化すべきか判定する。
 *
 * - 前後月からのはみ出しセル（同じ日付が2グリッドに出るため操作対象を1つに絞る）
 * - 未来日
 * - アーカイブ済み習慣
 * - `isDateKeyWithinWindow` の許容ウィンドウ外（サーバー側 `validateHabitActionInput` と同じ判定）
 */
function isCellTapDisabled(cell: DayCell, archived: boolean, todayDateKey: string): boolean {
  return !cell.isCurrentMonth || cell.isFuture || archived || !isDateKeyWithinWindow(cell.dateKey, todayDateKey)
}

/** `weeks`（1ヶ月ぶんの週グリッド）から dateKey に一致するセルを探す */
function findCellInWeeks(weeks: DayCell[][], dateKey: string): DayCell | undefined {
  for (const week of weeks) {
    for (const cell of week) {
      if (cell.dateKey === dateKey) {
        return cell
      }
    }
  }
  return undefined
}

/**
 * `fromDate` から `stepDays` ずつ日付を進め、その月の grid 内で最初に見つかった有効セルの
 * dateKey を返す。無効セル（disabled）は読み飛ばして同じ方向へ探索を続ける。
 * grid の外（padding の外）まで出た、または `maxSteps` に達した場合は null を返し、
 * 呼び出し元はフォーカスを移動させず現在位置に留まる（月境界で wrap しない）。
 */
function findNextValidDateKey(
  weeks: DayCell[][],
  fromDate: Date,
  stepDays: number,
  archived: boolean,
  todayDateKey: string,
  maxSteps: number
): string | null {
  let current = fromDate
  for (let i = 0; i < maxSteps; i++) {
    current = addDays(current, stepDays)
    const dateKey = formatDateKey(current)
    const cell = findCellInWeeks(weeks, dateKey)
    if (!cell) {
      return null
    }
    if (!isCellTapDisabled(cell, archived, todayDateKey)) {
      return dateKey
    }
  }
  return null
}

/**
 * `dateKey` が属する週（行）の最初／最後の操作可能セルの dateKey を返す。
 * その週に操作可能なセルが1つも無ければ null（フォーカスは移動しない）。
 */
function findRowEdgeDateKey(
  weeks: DayCell[][],
  dateKey: string,
  edge: 'first' | 'last',
  archived: boolean,
  todayDateKey: string
): string | null {
  const week = weeks.find((row) => row.some((cell) => cell.dateKey === dateKey))
  if (!week) {
    return null
  }
  const orderedCells = edge === 'first' ? week : [...week].reverse()
  for (const cell of orderedCells) {
    if (!isCellTapDisabled(cell, archived, todayDateKey)) {
      return cell.dateKey
    }
  }
  return null
}

// キー入力から「次にフォーカスすべき dateKey を探す関数」への対応表。ネストした条件分岐を避ける
// ためのルックアップ。Enter/Space/Tab はここに含めない（ネイティブ button の標準挙動に委ねる）。
const KEY_TO_FOCUS_MOVE: Record<
  string,
  (weeks: DayCell[][], cell: DayCell, archived: boolean, todayDateKey: string) => string | null
> = {
  ArrowDown: (weeks, cell, archived, todayDateKey) =>
    findNextValidDateKey(weeks, cell.date, 7, archived, todayDateKey, MAX_WEEK_SEARCH_STEPS),
  ArrowLeft: (weeks, cell, archived, todayDateKey) =>
    findNextValidDateKey(weeks, cell.date, -1, archived, todayDateKey, MAX_DAY_SEARCH_STEPS),
  ArrowRight: (weeks, cell, archived, todayDateKey) =>
    findNextValidDateKey(weeks, cell.date, 1, archived, todayDateKey, MAX_DAY_SEARCH_STEPS),
  ArrowUp: (weeks, cell, archived, todayDateKey) =>
    findNextValidDateKey(weeks, cell.date, -7, archived, todayDateKey, MAX_WEEK_SEARCH_STEPS),
  End: (weeks, cell, archived, todayDateKey) => findRowEdgeDateKey(weeks, cell.dateKey, 'last', archived, todayDateKey),
  Home: (weeks, cell, archived, todayDateKey) =>
    findRowEdgeDateKey(weeks, cell.dateKey, 'first', archived, todayDateKey),
}

/**
 * 月の初期フォーカス位置（roving tabindex の起点）を求める。
 * 当月なら今日（今日が何らかの理由で無効なら直近の操作可能日へフォールバック）、
 * 過去月なら最後の操作可能日。操作可能セルが1つも無い月は null（tabIndex=0 が0個になる）。
 */
function computeInitialFocusDateKey(
  weeks: DayCell[][],
  isCurrentMonthView: boolean,
  todayDateKey: string,
  archived: boolean
): string | null {
  const enabledDateKeys: string[] = []
  for (const week of weeks) {
    for (const cell of week) {
      if (cell.isCurrentMonth && !isCellTapDisabled(cell, archived, todayDateKey)) {
        enabledDateKeys.push(cell.dateKey)
      }
    }
  }
  if (enabledDateKeys.length === 0) {
    return null
  }
  if (!isCurrentMonthView) {
    // dateKey は 'yyyy-MM-dd' 形式で辞書順=時系列順に並ぶため、末尾が最後の操作可能日
    return enabledDateKeys.at(-1) ?? null
  }
  if (enabledDateKeys.includes(todayDateKey)) {
    return todayDateKey
  }
  // today 自体が無効（許容ウィンドウ外など）な場合は、直近の操作可能日にフォールバックする
  const pastOrToday = enabledDateKeys.filter((key) => key <= todayDateKey)
  return pastOrToday.length > 0 ? (pastOrToday.at(-1) ?? null) : enabledDateKeys[0]
}

interface CalendarCellProps {
  accentColor: string
  cell: DayCell
  descriptionId?: string
  disabled: boolean
  frequency: number
  /** キー入力そのものと、その月のキーボード探索に必要な weeks・monthLabel をまとめて渡す */
  monthLabel: string
  onKeyDown: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    cell: DayCell,
    monthLabel: string,
    weeks: DayCell[][]
  ) => void
  onTap: (cell: DayCell) => void
  /**
   * button 要素への参照登録。`refKey`（`${monthLabel}:${dateKey}`）と、それを受け取る安定した
   * コールバック（親の useRef を更新するだけで参照は変わらない）を分けて渡すことで、
   * 親側で毎レンダー新しい関数リテラルを JSX に直接渡さずに済む（lint/performance/noJsxPropsBind 対策）。
   */
  refKey: string
  registerCellRef: (key: string, el: HTMLButtonElement | null) => void
  tabIndex: number | undefined
  weeks: DayCell[][]
}

function CalendarCell({
  cell,
  accentColor,
  frequency,
  disabled,
  onTap,
  onKeyDown,
  descriptionId,
  monthLabel,
  weeks,
  refKey,
  registerCellRef,
  tabIndex,
}: CalendarCellProps) {
  const title = getCellTitle(cell, frequency)
  const ariaLabel = getCellAriaLabel(cell, frequency)
  const handleClick = useCallback(() => {
    onTap(cell)
  }, [cell, onTap])
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyDown(event, cell, monthLabel, weeks)
    },
    [cell, monthLabel, onKeyDown, weeks]
  )
  const handleRef = useCallback(
    (el: HTMLButtonElement | null) => {
      registerCellRef(refKey, el)
    },
    [refKey, registerCellRef]
  )

  return (
    <button
      aria-describedby={descriptionId}
      aria-label={ariaLabel}
      className={cn(
        'aspect-square w-full appearance-none rounded-sm border-0 bg-transparent p-0',
        'disabled:cursor-not-allowed',
        // フォーカスリング: `src/components/basics/Button.tsx` / `src/components/ui/` と同じ
        // focus-visible + ring-* の語彙に揃える。セルの背景はアクセントカラーの濃淡で
        // 習慣ごとに変わるため、ring 色は accentColor に依存しない固定トークン（ring-ring）を使い、
        // ring-offset-background でオフセット部分をページ背景色にしてどの背景でも視認できるようにする。
        // grid-cols-7 gap-1（4px）に対して ring-offset-2 + ring-2 は隣接セルの領域までは
        // 届かないが、丸め誤差での被りに備えて focus 中だけ z-10 で最前面に出す。
        'focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        !disabled && 'cursor-pointer',
        !cell.isCurrentMonth && 'opacity-30',
        cell.isFuture && 'opacity-10',
        cell.count === 0 && !cell.isSkip && 'bg-muted'
      )}
      disabled={disabled}
      key={cell.dateKey}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={handleRef}
      style={{ ...getCellStyle(cell, accentColor, frequency), touchAction: 'manipulation' }}
      tabIndex={tabIndex}
      title={title}
      type="button"
    />
  )
}

function buildMonthGrid(
  month: Date,
  checkinCounts: Map<string, number>,
  skipSet: Set<string>,
  today: Date
): DayCell[][] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ end, start })

  // 月曜始まり: 0=Mon, 1=Tue, ..., 6=Sun
  const startWeekday = (getDay(start) + 6) % 7 // 0=Mon
  const prefixCount = startWeekday

  const cells: DayCell[] = []

  // prefix empty cells
  for (let i = 0; i < prefixCount; i++) {
    const d = addDays(start, -(prefixCount - i))
    const dateKey = format(d, 'yyyy-MM-dd')
    cells.push({
      count: checkinCounts.get(dateKey) ?? 0,
      date: d,
      dateKey,
      isCurrentMonth: false,
      isFuture: d > today,
      isSkip: skipSet.has(dateKey),
    })
  }

  for (const day of days) {
    const dateKey = format(day, 'yyyy-MM-dd')
    cells.push({
      count: checkinCounts.get(dateKey) ?? 0,
      date: day,
      dateKey,
      isCurrentMonth: true,
      isFuture: day > today,
      isSkip: skipSet.has(dateKey),
    })
  }

  // pad to multiple of 7
  while (cells.length % 7 !== 0) {
    const d = addDays(end, cells.length - prefixCount - days.length + 1)
    const dateKey = format(d, 'yyyy-MM-dd')
    cells.push({
      count: checkinCounts.get(dateKey) ?? 0,
      date: d,
      dateKey,
      isCurrentMonth: false,
      isFuture: d > today,
      isSkip: skipSet.has(dateKey),
    })
  }

  // split into weeks
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

/**
 * `dateKey` の「確定カウント（サーバー snapshot）」に、未確定の add/clear 操作を
 * 登録順に適用した結果の実効カウントを求める。add は +1、clear は 0 リセット。
 * count が負になることはない（add は加算のみ、clear は 0 固定のため）。
 */
function computeEffectiveCount(
  dateKey: string,
  confirmedCounts: Map<string, number>,
  pendingOps: Map<string, PendingOp[]>
): number {
  let count = confirmedCounts.get(dateKey) ?? 0
  const ops = pendingOps.get(dateKey)
  if (ops) {
    for (const op of ops) {
      if (op.kind === 'add') {
        count += 1
      } else if (op.kind === 'clear') {
        count = 0
      }
    }
  }
  return count
}

/**
 * `dateKey` が属する期間（daily/weekly/monthly）の合計を、dateKey ごとの実効カウント
 * アクセサ `getCount` を使って求める。
 *
 * frequency の上限は日別ではなく期間単位で強制される（`createCheckinWithLimit` 参照）ため、
 * 「タップした日のカウント」だけを見て add/clear を決めると、週次・月次でチェックインが
 * 複数日に散っているときに誤判定する（同日に frequency 分無くても期間が満杯ならタップは
 * 拒否される）。呼び出し元によって「実効カウントの取得元」が異なる（enqueueTap は
 * confirmedCountsRef + pendingOpsRef から同期的に、選択中日の表示ヒントは表示用の
 * counts state から）ため、アクセサ関数として注入する。
 *
 * daily の場合は期間＝その日1日だけになるため、返り値は常に `getCount(dateKey)` と一致する
 * （既存の「日別カウントで判定する」挙動を回帰させない）。
 */
function sumEffectiveCountOverPeriod(
  dateKey: string,
  period: Period,
  weekStartDay: WeekStartDay,
  getCount: (key: string) => number
): number {
  const { start, end } = getPeriodDateRange(dateKey, period, weekStartDay)
  let total = 0
  for (const day of eachDayOfInterval({ end, start })) {
    total += getCount(formatDateKey(day))
  }
  return total
}

/** `dateKey` の「確定スキップ状態」に、未確定の removeSkip 操作を適用した実効状態を求める */
function computeEffectiveIsSkip(
  dateKey: string,
  confirmedSkip: Set<string>,
  pendingOps: Map<string, PendingOp[]>
): boolean {
  let isSkip = confirmedSkip.has(dateKey)
  const ops = pendingOps.get(dateKey)
  if (ops) {
    for (const op of ops) {
      if (op.kind === 'removeSkip') {
        isSkip = false
      }
    }
  }
  return isSkip
}

/** 表示用の counts 全体を「確定値 + 未確定操作列」から再構築する */
function computeDisplayCounts(
  confirmedCounts: Map<string, number>,
  pendingOps: Map<string, PendingOp[]>
): Map<string, number> {
  const keys = new Set<string>([...confirmedCounts.keys(), ...pendingOps.keys()])
  const result = new Map<string, number>()
  for (const key of keys) {
    const count = computeEffectiveCount(key, confirmedCounts, pendingOps)
    if (count > 0) {
      result.set(key, count)
    }
  }
  return result
}

/** 表示用の skipSet 全体を「確定値 + 未確定操作列」から再構築する */
function computeDisplaySkipSet(confirmedSkip: Set<string>, pendingOps: Map<string, PendingOp[]>): Set<string> {
  const keys = new Set<string>([...confirmedSkip, ...pendingOps.keys()])
  const result = new Set<string>()
  for (const key of keys) {
    if (computeEffectiveIsSkip(key, confirmedSkip, pendingOps)) {
      result.add(key)
    }
  }
  return result
}

/** 1件の操作を未確定操作列から取り除く（成功して確定値へ畳み込んだ後、または失敗して破棄する場合の両方で使う） */
function removePendingOp(pendingOps: Map<string, PendingOp[]>, dateKey: string, opId: string): void {
  const ops = pendingOps.get(dateKey)
  if (!ops) {
    return
  }
  const next = ops.filter((op) => op.id !== opId)
  if (next.length === 0) {
    pendingOps.delete(dateKey)
  } else {
    pendingOps.set(dateKey, next)
  }
}

export function HabitCalendarHeatmap({
  checkinCounts,
  skipDates = EMPTY_SKIP_DATES,
  accentColor,
  archived = false,
  frequency,
  habitId,
  months = 6,
  // 省略時は 'daily'。この場合 sumEffectiveCountOverPeriod の期間は当日1日だけになり、
  // period を渡さない既存の呼び出し（テスト・ストーリー含む）と挙動が変わらない
  period = 'daily',
  todayDateKey,
  // 省略時は月曜始まり（`DEFAULT_WEEK_START` と同じ既定）。daily では期間計算に影響しない
  weekStartDay = 1,
}: HabitCalendarHeatmapProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const today = useMemo(() => parseDateKey(todayDateKey), [todayDateKey])

  const legendSteps = useMemo(() => getLegendSteps(frequency), [frequency])

  // 「確定値（サーバー snapshot）＋ 未確定操作列」を source of truth とし、
  // 表示用の counts/skipSet state はその都度の導出結果を写したものにすぎない。
  //
  // 以前は countsRef/skipSetRef 自体を「楽観値」として直接書き換え、失敗時は `-1` のような
  // delta でロールバックしていた。この方式には2つの欠陥があった。
  //   1. props 再同期（refresh 後の新しい snapshot）が「進行中の未確定タップ」の有無を
  //      見ずに countsRef を丸ごと上書きしていたため、refresh の往復中に発生したタップが
  //      消えることがあった。
  //   2. 失敗時の `-1` ロールバックは「その時点の楽観値」に対して適用されるため、
  //      add/clear/add のように clear を挟む操作列では非可換になり、順序次第で
  //      最終表示がサーバー状態と食い違うことがあった。
  //
  // 新しい設計では、確定値（confirmedCountsRef/confirmedSkipRef）と、まだ成否が
  // 確定していない操作列（pendingOpsRef、dateKey ごとに add/clear/removeSkip を
  // 登録順に保持）を分離する。表示値は常に「確定値へ未確定操作列を順に適用した結果」
  // として computeDisplayCounts/computeDisplaySkipSet で導出する。
  //   - props 更新時: 確定値だけを新しい snapshot へ差し替え、未確定操作列はそのまま
  //     残して再適用する（rebase）。往復中に積まれたタップが消えない。
  //   - 操作成功時: その操作を確定値へ畳み込んでから未確定操作列から取り除く。
  //     畳み込みと除去を同時に行うため、表示値は変化しない（フリッカーが起きない）。
  //   - 操作失敗時: その操作を未確定操作列から取り除くだけ。他の未確定操作の解釈には
  //     一切影響しないため、delta によるロールバックが不要になる。
  const confirmedCountsRef = useRef<Map<string, number>>(new Map(checkinCounts))
  const confirmedSkipRef = useRef<Set<string>>(new Set(skipDates))
  const pendingOpsRef = useRef<Map<string, PendingOp[]>>(new Map())

  // props snapshot がローカルの未確定変更を含んでいるかどうかを判定するための仕組み。
  //
  // 問題: props 再同期（refresh 後の新しい snapshot）は「その snapshot がどの時点の DB を
  // 見たものか」を区別できない。何も対策しないと、
  //   (a) 未確定操作が残っている間に、その操作を既に反映した snapshot が届く（二重適用）
  //   (b) 操作が確定値へ畳み込まれた後、その操作を反映していない古い snapshot が届く（巻き戻し）
  // のどちらも起こり得る。
  //
  // 対策は2段構え:
  //   1. 未確定操作が1件でも残っていれば（pendingOpsRef が非空）、その snapshot が反映済みかは
  //      判定できないため無条件に破棄する（(a) を防ぐ）。
  //   2. pending が空でも、confirmedGenerationRef（確定値を書き換えた＝fold した回数。失敗した
  //      操作は fold しないため増えない）と dispatchedAtGenerationRef（scheduleRefresh が実際に
  //      router.refresh() を呼んだ時点 ＝ pending が必ず空だった時点の generation）を比較する。
  //      一致しなければ「dispatch 後に別の操作が fold された」ことを意味するため、その dispatch
  //      に対する応答は古い可能性があり破棄する（(b) を防ぐ）。
  // 失敗した操作は confirmedGenerationRef を進めないため、1. の pending チェックが外れた
  // 時点（＝失敗操作が捌けた直後）では generation は変化しておらず、次に届く snapshot は
  // 正しく採用される（失敗のたびに永続的に snapshot を拒否し続けることはない）。
  //
  // 破棄した場合は確定値・未確定操作列のどちらにも触れず、pendingSnapshotRetryRef を立てて
  // （未確定操作が捌けた後に）refresh を取り直す。
  const confirmedGenerationRef = useRef(0)
  const dispatchedAtGenerationRef = useRef(0)
  const pendingSnapshotRetryRef = useRef(false)

  const [counts, setCounts] = useState<Map<string, number>>(() => new Map(checkinCounts))
  const [skipSet, setSkipSet] = useState<Set<string>>(() => new Set(skipDates))

  // 直近にタップされたセルの dateKey。カレンダー外の情報表示に使う。
  // enqueueTap の中でのみ更新し、enqueueRestore（undo の復元）では更新しない
  // （undo 実行中にユーザーが見ている別の日の表示が勝手に変わらないようにするため）。
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  // 表示 state を「確定値 + 未確定操作列」から再構築する。呼び出し側（enqueueTap /
  // runTask の finally / props 再同期）が confirmedCountsRef・confirmedSkipRef・
  // pendingOpsRef のいずれかを更新した直後に呼ぶ。
  const recomputeDisplay = useCallback(() => {
    setCounts(computeDisplayCounts(confirmedCountsRef.current, pendingOpsRef.current))
    setSkipSet(computeDisplaySkipSet(confirmedSkipRef.current, pendingOpsRef.current))
  }, [])

  // props → state の同期は render 中の prev !== next 比較で行う（useEffect は使わない）。
  // ここで書き換えるのは「確定値」のみで、未確定操作列（pendingOpsRef）はそのまま残す。
  // 冪等な写し（`.claude/rules/optimistic-updates.md` 参照）であることに注意:
  // confirmedCountsRef.current への代入は checkinCounts の内容だけに依存し、
  // 直前の confirmedCountsRef の値には依存しないため、StrictMode 等で2回実行されても安全。
  // shouldAdoptSnapshot も ref の読み取りのみ（render 中に ref を書き換えない）なので同様に冪等。
  const shouldAdoptSnapshot =
    pendingOpsRef.current.size === 0 && confirmedGenerationRef.current === dispatchedAtGenerationRef.current

  const [prevCheckinCounts, setPrevCheckinCounts] = useState(checkinCounts)
  if (prevCheckinCounts !== checkinCounts) {
    setPrevCheckinCounts(checkinCounts)
    if (shouldAdoptSnapshot) {
      confirmedCountsRef.current = new Map(checkinCounts)
      setCounts(computeDisplayCounts(confirmedCountsRef.current, pendingOpsRef.current))
    } else {
      // このタイミングのローカル変更を含むか分からない snapshot は破棄する。確定値・
      // 未確定操作列のどちらにも触れない（=表示は変化しない）。副作用（retry の手配）は
      // render 中には行わず、後続の useEffect（pendingSnapshotRetryRef を見るもの）に委ねる。
      pendingSnapshotRetryRef.current = true
    }
  }

  const [prevSkipDates, setPrevSkipDates] = useState(skipDates)
  if (prevSkipDates !== skipDates) {
    setPrevSkipDates(skipDates)
    if (shouldAdoptSnapshot) {
      confirmedSkipRef.current = new Set(skipDates)
      setSkipSet(computeDisplaySkipSet(confirmedSkipRef.current, pendingOpsRef.current))
    } else {
      pendingSnapshotRetryRef.current = true
    }
  }

  // このコンポーネントが扱う habit 全体で単一の promise チェーン。
  //
  // 以前は dateKey ごとに別チェーンを持ち、別日への操作は並行実行されていた。しかし
  // frequency の上限は日別ではなく期間単位（週/月）で共有されるため、同一期間に属する
  // 別日への操作が並行すると「月曜を clear → 火曜に add」のような投入順と実行順がズレ、
  // add が先に走って上限拒否され、その後の clear で期間が空になる（チェックインが
  // 移動しない）事故が起きる（Codex 外部レビュー指摘）。このコンポーネントは1つの
  // habit だけを扱うため、直列化の粒度は「habit 全体で1本」で十分。より細かい粒度
  // （期間ごとに分ける等）は必要になれば検討するが、複雑さに見合う実益がないため見送った。
  //
  // 「進行中のセルは再タップを無視する」と実装すると連打が取りこぼされる（過去に実際に
  // 発生した不具合）ため、破棄はせずキューへ積み続ける。
  const taskChainRef = useRef<Promise<PerformResult>>(Promise.resolve({ ok: true }))
  // dateKey ごとの未完了タスク数。0 でなければ「進行中」とみなし、リフレッシュを見送る
  const pendingCountRef = useRef<Map<string, number>>(new Map())
  // タイマーの生存管理専用（発火時に必ず null へ戻す）。「pending 中でリフレッシュを見送ったか」は
  // 別の refreshDeferredRef で表す。1つの ref に「タイマーの有無」と「見送りの有無」の
  // 2つの意味を持たせると、成功時以外の pending 解消（失敗ロールバック等）でも
  // 過去に一度でも scheduleRefresh が呼ばれていれば再スケジュールされてしまう
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshDeferredRef = useRef(false)

  const monthList = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < months; i++) {
      result.push(subMonths(today, i))
    }
    return result
  }, [today, months])

  // monthList のインデックスに対応する monthLabel の一覧。月境界をまたいだ props 更新
  // （後述の focusedDateKeyByMonth 同期）で「どの月が新しく増えたか」を判定するために使う。
  const monthLabels = useMemo(() => monthList.map((month) => format(month, 'yyyy年M月', { locale: ja })), [monthList])

  // roving tabindex: 月ごとに「現在フォーカスされている dateKey」を1つだけ保持する。
  // ref ではなく state にする理由は、tabIndex（0/-1）を実際に DOM へ反映させ、Tab で
  // grid に再入場したときに正しい停止点へ戻れるようにするため（DOM の tabindex 属性が
  // 実際に更新されていないと、ブラウザの Tab 順序計算に反映されない）。
  //
  // 初期値は月ごとに「当月なら今日、過去月なら最後の操作可能日」（computeInitialFocusDateKey）。
  // 一度マウントされた後は、矢印キー操作でのみ更新する（props 更新時に再計算しない）ため、
  // 「再入場時は最後にフォーカスした日を保持する」がそのまま実現される
  // （tabIndex=0 を持つセルは常に1つで、それが Tab の戻り先になるため）。
  const [focusedDateKeyByMonth, setFocusedDateKeyByMonth] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    monthList.forEach((month, index) => {
      const weeks = buildMonthGrid(month, confirmedCountsRef.current, confirmedSkipRef.current, today)
      map[monthLabels[index]] = computeInitialFocusDateKey(weeks, index === 0, todayDateKey, archived)
    })
    return map
  })

  // props → state の同期は render 中の prev !== next 比較で行う（useEffect は使わない。
  // `.claude/rules/optimistic-updates.md` 参照）。
  //
  // 月境界をまたいで新しい `todayDateKey` が届くと、`monthList`（延いては monthLabels）に
  // 新しい当月が加わる。初回マウント時にしか走らない useState の初期化子だけでは、この
  // 新しい月の focusedDateKeyByMonth エントリが存在せず null のままになり、その月の全セルが
  // tabIndex=-1 になって Tab で入れなくなる（greptile / Codex 指摘）。
  //
  // monthLabelsKey（文字列化した monthLabels）が変化した時だけ、新しい monthLabels と
  // 既存の focusedDateKeyByMonth を突き合わせて整合させる:
  //   - 既存の月（ユーザーが矢印キーで移動済みかもしれない）はそのまま引き継ぐ
  //   - 新しく加わった月には、初回マウント時と同じ起点算出ロジックで初期位置を設定する
  //   - monthList から外れた月は次の map に含めないため、自然に整理される（メモリの単調増加を防ぐ）
  //
  // この比較・計算は confirmedCountsRef/confirmedSkipRef の「読み取り」のみで、ref への
  // 書き込みは行わない冪等な処理なので、StrictMode の二重 render でも安全（同じ入力に対して
  // 同じ next を計算するだけで、2回目の実行が1回目の結果を潰すことはない）。
  const monthLabelsKey = monthLabels.join('|')
  const [prevMonthLabelsKey, setPrevMonthLabelsKey] = useState(monthLabelsKey)
  if (prevMonthLabelsKey !== monthLabelsKey) {
    setPrevMonthLabelsKey(monthLabelsKey)
    setFocusedDateKeyByMonth((prev) => {
      const next: Record<string, string | null> = {}
      monthList.forEach((month, index) => {
        const monthLabel = monthLabels[index]
        if (monthLabel in prev) {
          next[monthLabel] = prev[monthLabel]
        } else {
          const weeks = buildMonthGrid(month, confirmedCountsRef.current, confirmedSkipRef.current, today)
          next[monthLabel] = computeInitialFocusDateKey(weeks, index === 0, todayDateKey, archived)
        }
      })
      return next
    })
  }

  const setFocusedDateKey = useCallback((monthLabel: string, dateKey: string) => {
    setFocusedDateKeyByMonth((prev) => ({ ...prev, [monthLabel]: dateKey }))
  }, [])

  // 月ごとのセル button 要素への参照（`${monthLabel}:${dateKey}` をキーにする）。
  // 矢印キー移動時に、tabIndex の state 更新（次の再レンダー）を待たず即座に .focus() を
  // 呼ぶために使う（button はネイティブに focusable なので tabIndex=-1 でも .focus() は効く）。
  const cellButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // cellButtonRefs への登録専用の安定したコールバック（依存なし）。CalendarCell 側で
  // refKey と束ねてから ref に渡すため、ここでは `${monthLabel}:${dateKey}` 形式の
  // key を受け取るだけでよい。
  const registerCellRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) {
      cellButtonRefs.current.set(key, el)
    } else {
      cellButtonRefs.current.delete(key)
    }
  }, [])

  // 矢印キー/Home/End の共通ハンドラ（安定した参照）。CalendarCell から
  // (event, cell, monthLabel, weeks) を受け取り、その月の grid 内で次にフォーカスすべき
  // dateKey を探して roving tabindex の state を更新し、即座に .focus() する。
  const handleCellKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, cell: DayCell, monthLabel: string, weeks: DayCell[][]) => {
      const move = KEY_TO_FOCUS_MOVE[event.key]
      if (!move) {
        return
      }
      event.preventDefault()
      const nextDateKey = move(weeks, cell, archived, todayDateKey)
      if (!nextDateKey) {
        return
      }
      setFocusedDateKey(monthLabel, nextDateKey)
      cellButtonRefs.current.get(`${monthLabel}:${nextDateKey}`)?.focus()
    },
    [archived, setFocusedDateKey, todayDateKey]
  )

  // 成功したタップの後、同一画面の統計カード（総チェックイン・スキップ回数）など
  // サーバー算出値を取り込むためのリフレッシュ。連打中は最後の操作から一定時間後に1回だけ走らせ、
  // 進行中のセルが残っている間は楽観的状態を上書きしないようスキップする。
  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null
      if (pendingCountRef.current.size > 0) {
        // pending のため見送った。最後のタスクが完了した時点で clearPending が取り直す
        refreshDeferredRef.current = true
        return
      }
      // この時点で pending は必ず空。「dispatch 済みの snapshot はここまでの fold を
      // 含んでいるはず」というチェックポイントとして記録する（props 再同期の shouldAdoptSnapshot 判定で使う）
      dispatchedAtGenerationRef.current = confirmedGenerationRef.current
      startTransition(() => {
        router.refresh()
      })
    }, REFRESH_DEBOUNCE_MS)
  }, [router])

  useEffect(
    () => () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    },
    []
  )

  // snapshot を破棄した（pendingSnapshotRetryRef が立った）場合の後始末。render 中には
  // 副作用（タイマー設定・ref の非冪等な書き換え）を行わないため、effect 側で処理する。
  // pending が既に空なら即座に refresh を取り直し、pending 中なら refreshDeferredRef を立てて
  // 既存の clearPending 経路（最後のタスク完了時に取り直す）に委ねる。これにより「snapshot を
  // 捨てっぱなしにしない」（最終的にサーバー値へ収束する）ことを保証する。
  useEffect(() => {
    if (!pendingSnapshotRetryRef.current) {
      return
    }
    pendingSnapshotRetryRef.current = false
    if (pendingCountRef.current.size === 0) {
      scheduleRefresh()
    } else {
      refreshDeferredRef.current = true
    }
  })

  const addPending = useCallback((dateKey: string) => {
    const current = pendingCountRef.current.get(dateKey) ?? 0
    pendingCountRef.current.set(dateKey, current + 1)
  }, [])

  const clearPending = useCallback(
    (dateKey: string) => {
      const current = pendingCountRef.current.get(dateKey) ?? 0
      if (current <= 1) {
        pendingCountRef.current.delete(dateKey)
      } else {
        pendingCountRef.current.set(dateKey, current - 1)
      }

      // pending 中に見送られたリフレッシュがあるときだけ、最後のタスク完了を起点に取り直す
      if (pendingCountRef.current.size === 0 && refreshDeferredRef.current) {
        refreshDeferredRef.current = false
        scheduleRefresh()
      }
    },
    [scheduleRefresh]
  )

  // performClear（全削除）の undo トースト → enqueueRestore（復元）を呼ぶための ref。
  // enqueueRestore は runTask に依存して定義されるため、runTask より前に定義される
  // performClear から直接参照できない（宣言順の循環）。ref 経由で解決する:
  // レンダーのたびに（コンポーネント本体の return 直前で）最新の enqueueRestore を
  // 書き写しておき、performClear の onAction からは ref 越しに呼び出す。
  const enqueueRestoreRef = useRef<((dateKey: string, count: number) => void) | null>(null)

  // 各操作種別ごとのサーバー呼び出し。成功時は確定値へ畳み込んで { ok: true } を返し、
  // 失敗（ok:false / created:false）時は確定値に触れず判別可能な失敗理由を返す。
  // 呼び出し元（runTask）が「成功したら畳み込んで未確定操作列から除去、失敗したら
  // 未確定操作列から除去するだけ」という共通のフローと、トースト表示を一手に担うため、
  // ここでは delta によるロールバックも toast 表示も行わない。
  const performRemoveSkip = useCallback(
    async (dateKey: string): Promise<PerformResult> => {
      const result = await removeSkipAction(habitId, dateKey)
      if (!result.ok) {
        return { error: result.error, ok: false, reason: classifyActionErrorReason(result.error) }
      }
      confirmedSkipRef.current.delete(dateKey)
      // 確定値を書き換えた（fold した）ので世代を進める（props 再同期の shouldAdoptSnapshot 判定用）
      confirmedGenerationRef.current += 1
      return { ok: true }
    },
    [habitId]
  )

  const performClear = useCallback(
    async (dateKey: string): Promise<PerformResult> => {
      const result = await clearCheckinAction(habitId, dateKey)
      if (!result.ok) {
        return { error: result.error, ok: false, reason: classifyActionErrorReason(result.error) }
      }
      confirmedCountsRef.current.delete(dateKey)
      confirmedGenerationRef.current += 1

      const { deletedCount } = result.data
      if (deletedCount > 0) {
        // 同じ日を続けて全削除した場合、sonner は同じ id のトーストを新しい内容で
        // 置き換える。id を habitId+dateKey で固定することで、古い undo トーストが
        // 残って誤った件数を復元する事故を防ぐ。
        const toastId = `checkin-clear-undo-${habitId}-${dateKey}`
        let consumed = false
        appToast.action(`${format(parseDateKey(dateKey), 'M月d日', { locale: ja })}の${deletedCount}件を削除しました`, {
          actionLabel: '取り消す',
          duration: CLEAR_UNDO_TOAST_DURATION_MS,
          id: toastId,
          onAction: () => {
            if (consumed) {
              return
            }
            consumed = true
            enqueueRestoreRef.current?.(dateKey, deletedCount)
          },
        })
      }

      return { ok: true }
    },
    [habitId]
  )

  const performAdd = useCallback(
    async (dateKey: string): Promise<PerformResult> => {
      const opId = createId()
      const result = await addCheckinAction(habitId, dateKey, opId)
      if (!result.ok) {
        return { error: result.error, ok: false, reason: classifyActionErrorReason(result.error) }
      }
      if (!result.data.created) {
        // 期間（週/月）内の frequency 上限に達している。日別カウントは増えない。
        return { ok: false, reason: 'limitReached' }
      }
      confirmedCountsRef.current.set(dateKey, (confirmedCountsRef.current.get(dateKey) ?? 0) + 1)
      confirmedGenerationRef.current += 1
      return { ok: true }
    },
    [habitId]
  )

  // 1件の未確定操作をサーバーへ送信し、成否に応じて確定値・未確定操作列を更新する。
  // - 成功: 操作の効果を確定値へ畳み込んでから、その操作を未確定操作列から取り除く
  //   （畳み込みと除去を同時に行うため表示値は変化しない＝フリッカーが起きない）
  // - 失敗（ok:false / created:false / 例外）: 確定値には触れず、その操作を
  //   未確定操作列から取り除くだけ。他の未確定操作（同じ dateKey の別タップを含む）の
  //   解釈には一切影響しない
  //
  // 再同期（scheduleRefresh）は「書き込み結果が不明な失敗」（unknown / exception）の
  // 後にも起動する。これらは実際には書き込みが成功していた可能性を排除できず、
  // クライアントの確定値がサーバーと食い違ったまま固定される事故を防ぐため。
  // rejected / limitReached は書き込みが起きていないことが確定しているため、
  // 再同期は不要（PerformResult の JSDoc 参照）。
  //
  // options.silent は enqueueRestore（復元）からの呼び出し用。復元は count 件の
  // add をまとめて発行するため、個別の失敗ごとにトーストを出すと、復元専用の
  // 集約トースト（enqueueRestore 側）と重複してしまう。
  const runTask = useCallback(
    async (dateKey: string, op: PendingOp, options?: { silent?: boolean }): Promise<PerformResult> => {
      let result: PerformResult
      let caughtError: unknown
      try {
        if (op.kind === 'removeSkip') {
          result = await performRemoveSkip(dateKey)
        } else if (op.kind === 'clear') {
          result = await performClear(dateKey)
        } else {
          result = await performAdd(dateKey)
        }
      } catch (error) {
        caughtError = error
        result = { ok: false, reason: 'exception' }
      }

      if (result.ok || result.reason === 'unknown' || result.reason === 'exception') {
        scheduleRefresh()
      }

      if (!(result.ok || options?.silent)) {
        if (result.reason === 'limitReached') {
          appToast.error(CHECKIN_LIMIT_REACHED_MESSAGE)
        } else if (result.reason === 'exception') {
          appToast.error(ERROR_MESSAGE_BY_KIND[op.kind], caughtError)
        } else {
          appToast.error(ERROR_MESSAGE_BY_KIND[op.kind], { message: formatSerializableError(result.error) })
        }
      }

      removePendingOp(pendingOpsRef.current, dateKey, op.id)
      recomputeDisplay()
      clearPending(dateKey)
      return result
    },
    [clearPending, performAdd, performClear, performRemoveSkip, recomputeDisplay, scheduleRefresh]
  )

  // タップのたびに「今その dateKey がどうなっているか」（確定値 + 積み済みの未確定操作列）を
  // 見て操作種別を即座に決め、対応する未確定操作もその場で（キュー実行を待たず）積んで
  // 表示へ反映する。これにより連打中も UI が即座に反応し、かつ「add が積み残っている状態で
  // clear が割り込む」ような場合も、割り込んだ時点で既に反映済みの値を対象にするため矛盾は
  // 起きない（`computeEffectiveCount` が未確定操作列を登録順に適用するため）。
  const enqueueTap = useCallback(
    (cell: DayCell) => {
      if (isCellTapDisabled(cell, archived, todayDateKey)) {
        return
      }

      const { dateKey } = cell
      setSelectedDateKey(dateKey)
      const currentCount = computeEffectiveCount(dateKey, confirmedCountsRef.current, pendingOpsRef.current)
      const isSkip = computeEffectiveIsSkip(dateKey, confirmedSkipRef.current, pendingOpsRef.current)
      // frequency の上限は日別ではなく期間単位（daily/weekly/monthly）で強制される
      // （`createCheckinWithLimit` 参照）。同一期間内の他日にチェックインが散っている場合、
      // 「その日のカウント」だけでは期間が満杯かどうか判定できない
      // （P1: 週次・月次でチェックインが削除できなくなる不具合の修正）。
      const periodTotal = sumEffectiveCountOverPeriod(dateKey, period, weekStartDay, (key) =>
        computeEffectiveCount(key, confirmedCountsRef.current, pendingOpsRef.current)
      )

      // isSkip を count に関わらず最優先で見る: チェックインとスキップは排他ではなく、
      // 同一日にチェックイン済みかつスキップ済みという状態が通常操作（ダッシュボードで
      // 「今日チェックイン → スキップ」）で実際に発生しうる。この状態でのタップは
      // 「スキップ日はタップでスキップ解除のみ」という仕様どおりに解釈する必要があるため、
      // count による循環トグル（add/clear）より isSkip を先に判定する。
      //
      // clear の判定は「その日にカウントがあり、かつ期間が満杯」。period が daily のときは
      // periodTotal === currentCount になるため、この条件は旧来の `currentCount >= frequency`
      // と完全に一致する（回帰なし）。period total は常に currentCount 以上（当日ぶんを含む
      // 合計のため）なので、`currentCount >= frequency` は `currentCount > 0 && periodTotal >=
      // frequency` の部分集合であり、別条件として重複させる必要はない。
      // 期間が満杯でもその日のカウントが0のセルは add を試み、サーバー側の created:false と
      // トーストで「上限到達」を伝える（現状どおり）。
      let kind: PendingOp['kind']
      if (isSkip) {
        kind = 'removeSkip'
      } else if (currentCount > 0 && periodTotal >= frequency) {
        kind = 'clear'
      } else {
        kind = 'add'
      }

      const op: PendingOp = { id: createId(), kind }
      const existingOps = pendingOpsRef.current.get(dateKey) ?? []
      // pendingOpsRef が非空である間、shouldAdoptSnapshot は無条件に false になる
      // （この操作の成否が確定するまで、届く props snapshot がこの操作を反映済みかどうか
      // 判定できないため）。世代カウンタ自体は fold（成功時の確定値書き換え）でのみ進める。
      pendingOpsRef.current.set(dateKey, [...existingOps, op])
      recomputeDisplay()

      addPending(dateKey)
      // habit 全体で単一チェーンに直列化する（taskChainRef 参照）。同一期間内の別日への
      // 操作が並行実行されないため、投入順どおりに実行される。
      const previous = taskChainRef.current
      // runTask は内部で例外を握りつぶす（try/catch 済み）ため、このチェーンが reject することはない
      const next = previous.then(() => runTask(dateKey, op))
      taskChainRef.current = next
    },
    [addPending, archived, frequency, period, recomputeDisplay, runTask, todayDateKey, weekStartDay]
  )

  // undo トースト（performClear）から呼ばれる、削除件数ぶんの add を復元するキュー投入。
  //
  // enqueueTap は再利用しない: enqueueTap は「今の実効カウント」から kind を動的に決める
  // （上限到達なら clear、そうでなければ add という cycle 判定）。復元をそのまま
  // enqueueTap を count 回呼ぶ形にすると、途中で別のタップが割り込んで frequency に
  // 達した場合、以後の呼び出しが add ではなく clear になってしまう。そのため
  // kind: 'add' を固定した PendingOp を直接 pendingOpsRef / taskChainRef へ積む
  // 専用ロジックにしている（enqueueTap の該当部分とほぼ同じ形だが kind 固定・count 回
  // ループする点だけが異なる）。
  const enqueueRestore = useCallback(
    async (dateKey: string, count: number) => {
      const results: Promise<PerformResult>[] = []
      for (let i = 0; i < count; i++) {
        const op: PendingOp = { id: createId(), kind: 'add' }
        const existingOps = pendingOpsRef.current.get(dateKey) ?? []
        pendingOpsRef.current.set(dateKey, [...existingOps, op])
        recomputeDisplay()

        addPending(dateKey)
        // enqueueTap と同じ単一チェーン（taskChainRef）に乗せる。undo からの復元も
        // habit 全体の直列化に従うため、進行中の他日への操作と投入順がズレない。
        const previous = taskChainRef.current
        // 復元中は個別トーストを抑制し、この関数末尾の集約トーストだけを出す
        // （個別トーストと集約トーストの二重通知を防ぐ）
        const next = previous.then(() => runTask(dateKey, op, { silent: true }))
        taskChainRef.current = next
        results.push(next)
      }

      const outcomes = await Promise.all(results)
      let succeededCount = 0
      const failureReasons: Exclude<PerformResult, { ok: true }>['reason'][] = []
      for (const outcome of outcomes) {
        if (outcome.ok) {
          succeededCount += 1
        } else {
          failureReasons.push(outcome.reason)
        }
      }
      // 失敗理由が全て limitReached のときだけ「上限到達」と断定する。通信エラー等
      // （unknown / exception / rejected）が混ざる、または全てを占める場合は、
      // 原因を断定しない文面にする（実際には上限に達していないのに誤って
      // 「上限」と伝えるのを避けるため）
      const allFailuresAreLimitReached =
        failureReasons.length > 0 && failureReasons.every((reason) => reason === 'limitReached')

      // 完全失敗と部分失敗を区別するのは、ユーザーが「何件戻ったか」を正しく把握できるようにするため
      if (succeededCount === 0) {
        if (allFailuresAreLimitReached) {
          appToast.error(`復元できませんでした（${CHECKIN_LIMIT_REACHED_MESSAGE}）`)
        } else {
          appToast.error('復元できませんでした。しばらくしてからもう一度お試しください')
        }
      } else if (succeededCount < count) {
        if (allFailuresAreLimitReached) {
          appToast.info(
            `${succeededCount}/${count}件を復元しました`,
            `残り${count - succeededCount}件はこの期間の上限のため復元できませんでした`
          )
        } else {
          appToast.info(
            `${succeededCount}/${count}件を復元しました`,
            `残り${count - succeededCount}件は復元できませんでした`
          )
        }
      }
    },
    [addPending, recomputeDisplay, runTask]
  )

  // enqueueRestore は runTask に依存するため、宣言順の都合で performClear より後に
  // 定義される。performClear の onAction から最新の enqueueRestore を呼べるよう、
  // レンダーのたびに ref へ書き写す（副作用ではなく値の写しなので useEffect は使わない）。
  enqueueRestoreRef.current = enqueueRestore

  // counts/skipSet（pending 中の値も反映済みの表示 state）から都度導出するため、
  // pending → 確定への遷移でも自動的に最新値になる
  const selectedDateInfo = useMemo(() => {
    if (!selectedDateKey) {
      return null
    }
    // 表示用の counts state（confirmedCounts + pendingOps を畳み込んだもの）から期間合計を
    // 求める。enqueueTap の kind 決定と同じ「期間合計 >= frequency」規則で「次のタップは
    // 削除」のヒントを出す（daily では periodTotal === その日の count になるため回帰なし）。
    const periodTotal = sumEffectiveCountOverPeriod(
      selectedDateKey,
      period,
      weekStartDay,
      (key) => counts.get(key) ?? 0
    )
    return getSelectedDateInfo(
      selectedDateKey,
      counts.get(selectedDateKey) ?? 0,
      skipSet.has(selectedDateKey),
      frequency,
      periodTotal >= frequency
    )
  }, [counts, frequency, period, selectedDateKey, skipSet, weekStartDay])

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {legendSteps.map((step) => (
              <div
                className="h-3 w-3 rounded-sm"
                key={step}
                style={{ backgroundColor: getCheckinColor(step, frequency, accentColor) }}
                title={`${step}/${frequency}回`}
              />
            ))}
          </div>
          <span>チェックイン（達成率に応じて濃く表示）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border-2 border-dashed" style={{ borderColor: accentColor }} />
          <span>スキップ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <span>未達成</span>
        </div>
      </div>

      {/*
        選択中の日の情報表示。セル自体（CalendarCell）の見た目・aria-label は一切変更しない。
        aria-live は付けない: セルの aria-label に既に `2026-09-08 3/8回` 形式の情報があり、
        この領域はその視覚的な補完に過ぎない。aria-live="polite" を付けると連打のたびに
        読み上げが発生し洪水になるため付けない。
      */}
      <div className="min-h-[3.5rem] rounded-md border border-dashed p-3 text-sm">
        {selectedDateInfo ? (
          <div className="space-y-1">
            <p>{selectedDateInfo.primary}</p>
            <p className="text-muted-foreground text-xs">{selectedDateInfo.hint}</p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">セルをタップすると、日付と回数がここに表示されます</p>
        )}
      </div>

      {/*
        各月の role="grid" が共通で参照する、キー操作の説明。個別セルの次の操作
        （aria-describedby、getCellDescriptionText 参照）とは別に、grid 自体へ一度だけ関連付ける。
      */}
      <p className="sr-only" id={KEYBOARD_INSTRUCTIONS_ID}>
        矢印キーで日付を移動します。左右は前後の日、上下は同じ曜日の前後の週です。Home
        キーでその週の最初の操作可能日、End キーで最後の操作可能日に移動します。Enter
        キーまたはスペースキーで選択した日の操作を実行します。
      </p>

      {monthList.map((month) => {
        const weeks = buildMonthGrid(month, counts, skipSet, today)
        const monthLabel = format(month, 'yyyy年M月', { locale: ja })
        const monthHeadingId = `habit-calendar-month-heading-${monthLabel}`
        const focusedDateKey = focusedDateKeyByMonth[monthLabel] ?? null

        const weekRows: HabitCalendarGridCellData[][] = weeks.map((week) =>
          week.map((cell) => {
            const disabled = isCellTapDisabled(cell, archived, todayDateKey)
            const periodTotal = sumEffectiveCountOverPeriod(
              cell.dateKey,
              period,
              weekStartDay,
              (key) => counts.get(key) ?? 0
            )
            const descriptionText = getCellDescriptionText(cell, archived, todayDateKey, periodTotal >= frequency)
            const descriptionId = descriptionText ? `habit-calendar-desc-${monthLabel}-${cell.dateKey}` : undefined
            const isTabStop = !disabled && cell.dateKey === focusedDateKey
            const refKey = `${monthLabel}:${cell.dateKey}`
            // disabled セルはネイティブの disabled 属性だけでフォーカス対象から除外される。
            // disabled な button に明示的な tabIndex（0 や -1）を与えると、一部の DOM 実装
            // （jsdom を含む）で「disabled のはずなのに .focus() が効いてしまう」挙動になる
            // ことが実測で確認できたため、disabled セルには tabIndex 自体を渡さない。
            let cellTabIndex: number | undefined
            if (disabled) {
              cellTabIndex = undefined
            } else {
              cellTabIndex = isTabStop ? 0 : -1
            }

            return {
              content: (
                <>
                  <CalendarCell
                    accentColor={accentColor}
                    cell={cell}
                    descriptionId={descriptionId}
                    disabled={disabled}
                    frequency={frequency}
                    monthLabel={monthLabel}
                    onKeyDown={handleCellKeyDown}
                    onTap={enqueueTap}
                    refKey={refKey}
                    registerCellRef={registerCellRef}
                    tabIndex={cellTabIndex}
                    weeks={weeks}
                  />
                  {descriptionText ? (
                    <span className="sr-only" id={descriptionId}>
                      {descriptionText}
                    </span>
                  ) : null}
                </>
              ),
              key: cell.dateKey,
            }
          })
        )

        return (
          <div className="space-y-2" key={monthLabel}>
            <div className="font-medium text-foreground text-sm" id={monthHeadingId}>
              {monthLabel}
            </div>
            {/* 月ごとに独立した grid にする（全体を1つの grid にしない）。構造マークアップ
                （role="grid"/"row"/"columnheader"/"gridcell"）は HabitCalendarGridStructure
                （biome.jsonc の scoped override 対象）へ切り出し済み */}
            <HabitCalendarGridStructure
              keyboardInstructionsId={KEYBOARD_INSTRUCTIONS_ID}
              monthHeadingId={monthHeadingId}
              weekdayLabels={WEEKDAY_LABELS}
              weekRows={weekRows}
            />
          </div>
        )
      })}
    </div>
  )
}
