export type IdentityFetchFailureResolution = { action: 'clear' } | { action: 'restore-cache' }

/** `/api/me` の fetch 自体が throw したときの localStorage 方針 */
export function resolveIdentityOnMeFetchFailure(online: boolean): IdentityFetchFailureResolution {
  return online ? { action: 'clear' } : { action: 'restore-cache' }
}
