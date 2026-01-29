import { Result } from '@praha/byethrow'

export type ServerActionResult<T, E> =
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
    ok: true,
    data: data as T,
  }
}

export function actionError<E>(error: E): ServerActionResult<never, E> {
  return {
    ok: false,
    error,
  }
}

export function toActionResult<T, E>(result: Result.Result<T, E>): ServerActionResult<T, E> {
  return Result.isSuccess(result) ? actionOk(result.value) : actionError(result.error)
}
