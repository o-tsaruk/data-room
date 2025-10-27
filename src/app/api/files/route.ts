import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return NextResponse.json({ files: [] });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (!user) return NextResponse.json({ files: [] });

    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      return NextResponse.json({ files: [] });
    }

    const camelFiles = (files ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      url: f.url,
      iconUrl: f.icon_url,
      mimeType: f.mime_type,
      lastEditedDate: f.last_edited,
      uploadedAt: f.uploaded_at,
    }));

    return NextResponse.json({ files: camelFiles });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ files: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { session_token, files } = await req.json();

    if (!session_token) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('session_token', session_token)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const newFiles = files.map((f: any) => ({
      id: f.id,
      user_id: user.id,
      name: f.name,
      url: f.url,
      icon_url: f.iconUrl,
      mime_type: f.mimeType,
    }));

    const { error } = await supabase.from('files').upsert(newFiles, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting files:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const sessionToken = req.headers.get('x-session-token');

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    if (!fileId) {
      return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { error } = await supabase.from('files').delete().eq('id', fileId).eq('user_id', user.id);

    if (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
