import { NextResponse, type NextRequest } from 'next/server';

// Public routes — no auth required. All other routes rely on client-side session checks.
// Listed here for documentation and to provide a hook for future server-side auth guards.
// const PUBLIC_PREFIXES = ['/check-in', '/pray', '/accept-invite', '/auth', '/bulletin', '/kids-checkin', '/api/check-in', '/api/prayer-requests/public', '/api/communication/feed', '/api/shepherd/accept', '/api/bulletins/public', '/api/children-ministry/visitor-flow'];

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)'],
};
