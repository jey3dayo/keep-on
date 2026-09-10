'use client'

import { createId } from '@paralleldrive/cuid2'
import { addDays, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { clearCheckinAction } from '@/app/actions/habits/clear-checkin'
import { removeSkipAction } from '@/app/actions/habits/skip'
import { formatSerializableError, type SerializableHabitError } from '@/lib/errors/serializable'
import { cn } from '@/lib/utils'
import { isDateKeyWithinWindow, parseDateKey } from '@/lib/utils/date'
import { appToast } from '@/lib/utils/toast'

interface HabitCalendarHeatmapProps {
  accentColor: string
  /** アーカイブ済みの習慣はサーバー側で操作が拒否されるため、セルのタップも無効化する */
  archived?: boolean
  checkinCounts: Map<string, number>
  frequency: number
  habitId: string
  months?: number
  skipDates?: string[]
  /**
   * サーバーで算出した「今日」の dateKey（dayStartHour 考慮済み）。
   * client の `new Date()` を使うと記録先（サーバー算出の dateKey）と today 判定がズレる。
   */
  todayDateKey: string
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

interface SelectedDateInfo {
  /** 上限到達・スキップ中など、次のタップが何を意味するかのヒント文言 */
  hint: string
  /** `${M月d日}の情報` に続く達成状況の本文 */
  primary: string
}

/**
 * カレンダー外に表示する「選択中の日」の情報テキストを組み立てる。
 * セル自体（CalendarCell）の見た目・aria-label は変更せず、この表示専用のテキストを別途導出する。
 */
function getSelectedDateInfo(dateKey: string, count: number, isSkip: boolean, frequency: number): SelectedDateInfo {
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

  if (count >= frequency) {
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

interface CalendarCellProps {
  accentColor: string
  cell: DayCell
  disabled: boolean
  frequency: number
  onTap: (cell: DayCell) => void
}

function CalendarCell({ cell, accentColor, frequency, disabled, onTap }: CalendarCellProps) {
  const title = getCellTitle(cell, frequency)
  const handleClick = useCallback(() => {
    onTap(cell)
  }, [cell, onTap])

  return (
    <button
      aria-label={title}
      className={cn(
        'aspect-square w-full appearance-none rounded-sm border-0 bg-transparent p-0',
        'disabled:cursor-not-allowed',
        !disabled && 'cursor-pointer',
        !cell.isCurrentMonth && 'opacity-30',
        cell.isFuture && 'opacity-10',
        cell.count === 0 && !cell.isSkip && 'bg-muted'
      )}
      disabled={disabled}
      key={cell.dateKey}
      onClick={handleClick}
      style={{ ...getCellStyle(cell, accentColor, frequency), touchAction: 'manipulation' }}
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
  todayDateKey,
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

  // 同一 dateKey へのタップは直列化しつつ、別の dateKey とは並行して進められるようにする
  // キュー（dateKey ごとの promise チェーン）。「進行中のセルは再タップを無視する」と
  // 実装すると連打が取りこぼされる（過去に実際に発生した不具合）ため、破棄はしない。
  const taskChainsRef = useRef<Map<string, Promise<PerformResult>>>(new Map())
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

      // isSkip を count に関わらず最優先で見る: チェックインとスキップは排他ではなく、
      // 同一日にチェックイン済みかつスキップ済みという状態が通常操作（ダッシュボードで
      // 「今日チェックイン → スキップ」）で実際に発生しうる。この状態でのタップは
      // 「スキップ日はタップでスキップ解除のみ」という仕様どおりに解釈する必要があるため、
      // count による循環トグル（add/clear）より isSkip を先に判定する。
      let kind: PendingOp['kind']
      if (isSkip) {
        kind = 'removeSkip'
      } else if (currentCount >= frequency) {
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
      const previous = taskChainsRef.current.get(dateKey) ?? Promise.resolve<PerformResult>({ ok: true })
      // runTask は内部で例外を握りつぶす（try/catch 済み）ため、このチェーンが reject することはない
      const next = previous.then(() => runTask(dateKey, op))
      taskChainsRef.current.set(dateKey, next)
    },
    [addPending, archived, frequency, recomputeDisplay, runTask, todayDateKey]
  )

  // undo トースト（performClear）から呼ばれる、削除件数ぶんの add を復元するキュー投入。
  //
  // enqueueTap は再利用しない: enqueueTap は「今の実効カウント」から kind を動的に決める
  // （上限到達なら clear、そうでなければ add という cycle 判定）。復元をそのまま
  // enqueueTap を count 回呼ぶ形にすると、途中で別のタップが割り込んで frequency に
  // 達した場合、以後の呼び出しが add ではなく clear になってしまう。そのため
  // kind: 'add' を固定した PendingOp を直接 pendingOpsRef / taskChainsRef へ積む
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
        const previous = taskChainsRef.current.get(dateKey) ?? Promise.resolve<PerformResult>({ ok: true })
        // 復元中は個別トーストを抑制し、この関数末尾の集約トーストだけを出す
        // （個別トーストと集約トーストの二重通知を防ぐ）
        const next = previous.then(() => runTask(dateKey, op, { silent: true }))
        taskChainsRef.current.set(dateKey, next)
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
    return getSelectedDateInfo(
      selectedDateKey,
      counts.get(selectedDateKey) ?? 0,
      skipSet.has(selectedDateKey),
      frequency
    )
  }, [counts, frequency, selectedDateKey, skipSet])

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

      {monthList.map((month) => {
        const weeks = buildMonthGrid(month, counts, skipSet, today)
        const monthLabel = format(month, 'yyyy年M月', { locale: ja })

        return (
          <div className="space-y-2" key={monthLabel}>
            <div className="font-medium text-foreground text-sm">{monthLabel}</div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div className="text-center text-muted-foreground text-xs" key={label}>
                  {label}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="space-y-1">
              {weeks.map((week, wi) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable week index
                <div className="grid grid-cols-7 gap-1" key={wi}>
                  {week.map((cell) => (
                    <CalendarCell
                      accentColor={accentColor}
                      cell={cell}
                      disabled={isCellTapDisabled(cell, archived, todayDateKey)}
                      frequency={frequency}
                      key={cell.dateKey}
                      onTap={enqueueTap}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
