import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { serverSession } from '@/src/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { access_token } = await req.json();
    if (!access_token) return NextResponse.json({ error: 'No access token' }, { status: 400 });

    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });

    const data = await res.json();
    const { id: google_sub, email } = data;

    const session_token = uuidv4();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('google_sub', google_sub)
      .single();

    if (existingUser) {
      await supabase.from('users').update({ session_token }).eq('id', existingUser.id);
    } else {
      await supabase.from('users').insert({
        google_sub,
        email,
        session_token,
      });
    }

    return NextResponse.json({ session_token });
  } catch (err) {
    console.error('Session error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await serverSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    session,
  });
}
