import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { serverSession } from '@/src/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { fileId, starred } = await req.json();
    if (!fileId || typeof starred !== 'boolean') {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const { error } = await supabase
      .from('files')
      .update({ starred })
      .eq('id', fileId)
      .eq('user_email', email);

    if (error) {
      console.error('Error updating starred:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Star toggle error:', e);
    return NextResponse.json({ error: e.message ?? 'Server error' }, { status: 500 });
  }
}
