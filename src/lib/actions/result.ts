import { Result } from '@praha/byethrow'

type ServerActionResult<T, E> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: E
    }

export type ServerActionResultAsync<T, E> = Promise<ServerActionResult<T, E>>

export function actionOk(): ServerActionResult<void, never>
export function actionOk<T>(data: T): ServerActionResult<T, never>
export function actionOk<T>(data?: T): ServerActionResult<T, never> {
  return {
    data: data as T,
    ok: true,
  }
}

export function actionError<E>(error: E): ServerActionResult<never, E> {
  return {
    error,
    ok: false,
  }
}

export function toActionResult<T, E>(result: Result.Result<T, E>): ServerActionResult<T, E> {
  return Result.isSuccess(result) ? actionOk(result.value) : actionError(result.error)
}
