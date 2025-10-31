import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/chat']);
const publicRoutes = createRouteMatcher(['/', '/sign-in', '/sign-up', '/sign-in/sso-callback', '/sign-in/continue']);

export default clerkMiddleware(async (auth, req) => {
  const { isAuthenticated } = await auth(); // Await the auth function

  // Allow SSO callback and continue-signup to proceed without redirects
  if (req.nextUrl.pathname === '/sso-callback' || req.nextUrl.pathname === '/continue-signup') {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  if (publicRoutes(req)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/chat', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
