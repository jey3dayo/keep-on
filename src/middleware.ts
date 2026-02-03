import { clerkMiddleware, createRouteMatcher, type ClerkMiddlewareOptions } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/offline',
  '/health(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.searchParams.has('__clerk_handshake')) {
    // Clerk ハンドシェイクは認証保護をスキップしてリダイレクトループを回避
    return NextResponse.next()
  }
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
  return NextResponse.next()
}, getClerkMiddlewareOptions())

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

function getClerkMiddlewareOptions(): ClerkMiddlewareOptions {
  return {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  }
}
