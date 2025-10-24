import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/chat']);
const publicRoutes = createRouteMatcher(['/', '/sign-in', '/sign-up']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth(); // Await the auth function

  if (isProtectedRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  if (publicRoutes(req)) {
    if (userId) {
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
