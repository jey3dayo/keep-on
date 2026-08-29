/** 長押しで操作メニューを開くまでの待機時間 */
export const LONG_PRESS_DURATION_MS = 500

/** スクロール操作を長押しと誤検知しないための移動許容量 */
export const LONG_PRESS_MOVE_THRESHOLD_PX = 10

/** 横スワイプの意図を確定するための移動量。長押しのキャンセル閾値と揃えて誤操作を防ぐ */
export const PAGE_SWIPE_INTENT_THRESHOLD_PX = LONG_PRESS_MOVE_THRESHOLD_PX

/** ページ切り替えに必要な横移動量のコンテナ幅に対する割合 */
export const PAGE_SWIPE_DISTANCE_THRESHOLD_RATIO = 0.25

/** ページ切り替えに必要な速度（px/ms） */
export const PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS = 0.3

/** pointerup まで移動がない場合に、直前の速度を有効とみなす時間 */
export const PAGE_SWIPE_VELOCITY_STALE_TIMEOUT_MS = 100

/** 端の外向きスワイプに適用するラバーバンドの強さ */
export const PAGE_SWIPE_RUBBER_BAND_FACTOR = 0.55

/** ページスナップのアニメーション時間 */
export const PAGE_SWIPE_TRANSITION_DURATION_MS = 250

/** 進捗1ポイントあたりのリング掃引時間。全周でも約280msとなり、等速の動きを読み取れる長さにする */
export const PROGRESS_RING_DURATION_PER_PERCENT_MS = 2.8

/** 25%以下の短い掃引でも瞬きにならない最低時間 */
export const PROGRESS_RING_MIN_DURATION_MS = 130

/** 大きな進捗更新でも300msを超えて操作感を損なわない上限 */
export const PROGRESS_RING_MAX_DURATION_MS = 300

/** 完了時の内円反転にかける時間 */
export const HABIT_INVERSION_DURATION_MS = 140
