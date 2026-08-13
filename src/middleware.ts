import { NextResponse } from 'next/server'

/**
 * Cloudflare Access が前段でアクセスを強制するため、ここでは認証判定を行わない。
 *
 * Access JWT の検証は JWKS の fetch を伴う。middleware は全リクエストで走るため、
 * ここで検証するとエッジでの往復が毎回増える。検証は identity を実際に必要とする
 * server component / route handler 層（getAccessIdentity）でのみ行う。
 */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
