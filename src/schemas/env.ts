import * as v from 'valibot'

/**
 * Cloudflare Access の JWT 検証に必要な環境変数。
 *
 * `NEXT_PUBLIC_*` は Next.js がビルド時にリテラルへ置換するため、ランタイムに
 * `process.env` 参照が残らない。起動時に検証しても実行環境の設定ミスは捕まらず、
 * 逆にビルド時の注入漏れを実行環境の不備として誤検知する。ビルド側で検査する。
 * `CLOUDFLARE_*` はデプロイ時にのみ使う値で、Worker ランタイムには存在しないのが正常。
 *
 * 開発では Access の前段が無く、`DEV_ACCESS_EMAIL` によるフォールバックで動かすため
 * 未設定を許容する。本番では未設定 = 認証が成立しない設定ミスなので必須にする。
 */
const accessEnvSchema = v.object({
  ACCESS_AUD: v.pipe(v.string(), v.minLength(1)),
  ACCESS_TEAM_DOMAIN: v.pipe(v.string(), v.minLength(1)),
})

const optionalAccessEnvSchema = v.object({
  ACCESS_AUD: v.optional(v.pipe(v.string(), v.minLength(1))),
  ACCESS_TEAM_DOMAIN: v.optional(v.pipe(v.string(), v.minLength(1))),
})

export interface AccessEnvInput {
  ACCESS_AUD?: string
  ACCESS_TEAM_DOMAIN?: string
}

/**
 * 検証に失敗したキー名だけを返す。
 *
 * ValiError の issues は入力値を保持するため、例外や戻り値に載せると
 * 秘密情報がログへ流出する。キー名のみを返して呼び出し側が値に触れないようにする。
 */
export function findInvalidAccessEnvKeys(input: AccessEnvInput, isProduction: boolean): string[] {
  return collectInvalidKeys(isProduction ? accessEnvSchema : optionalAccessEnvSchema, input)
}

function collectInvalidKeys(schema: v.GenericSchema, input: unknown): string[] {
  const result = v.safeParse(schema, input)

  if (result.success) {
    return []
  }

  return result.issues.map((issue) => v.getDotPath(issue) ?? 'unknown')
}
