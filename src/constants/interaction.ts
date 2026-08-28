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
