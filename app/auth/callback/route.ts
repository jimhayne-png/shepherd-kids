import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const params = searchParams.toString();
  const destination = params ? `${origin}/dashboard?${params}` : `${origin}/dashboard`;
  return NextResponse.redirect(destination);
}
