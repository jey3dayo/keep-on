import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DayStartHourSettings } from './DayStartHourSettings'

const { updateDayStartHourActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateDayStartHourActionMock: vi.fn(),
}))

vi.mock('@/app/actions/settings/updateDayStartHour', () => ({
  updateDayStartHourAction: updateDayStartHourActionMock,
}))

vi.mock('@/lib/utils/toast', () => ({
  appToast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

describe('DayStartHourSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('サーバーから渡された初期値がラジオボタンの選択状態に反映される', () => {
    render(<DayStartHourSettings initialDayStartHour={26} />)

    expect(screen.getByRole('radio', { name: /24時/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /29時/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /26時/ })).toBeChecked()
  })

  it('選択を変更すると更新アクションが呼ばれ、成功時に選択状態が反映される', async () => {
    updateDayStartHourActionMock.mockResolvedValue({ data: undefined, ok: true })

    render(<DayStartHourSettings initialDayStartHour={24} />)

    fireEvent.click(screen.getByRole('radio', { name: /26時/ }))

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /26時/ })).toBeChecked()
    })

    expect(updateDayStartHourActionMock).toHaveBeenCalledWith(26)
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('更新が失敗した場合は選択状態を変更せずエラーを通知する', async () => {
    updateDayStartHourActionMock.mockResolvedValue({ error: new Error('failed'), ok: false })

    render(<DayStartHourSettings initialDayStartHour={24} />)

    fireEvent.click(screen.getByRole('radio', { name: /27時/ }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })

    expect(screen.getByRole('radio', { name: /24時/ })).toBeChecked()
  })
})
