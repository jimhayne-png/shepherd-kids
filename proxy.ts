import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes — no auth logic runs here, even if auth logic is added later.
// /kiosk and /api/kiosk are intentionally excluded from the matcher below.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   /kiosk/:path*       — public kiosk check-in pages
     *   /api/kiosk/:path*   — public kiosk API routes
     *   _next/static        — static assets
     *   _next/image         — image optimization
     *   favicon.ico         — favicon
     */
    '/((?!kiosk|api/kiosk|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
