import { NextResponse } from 'next/server';
import { serverSession } from '@/src/auth';

export async function GET(req: Request) {
  const session = await serverSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    session,
  });
}
