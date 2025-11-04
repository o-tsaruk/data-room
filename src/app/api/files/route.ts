import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { serverSession } from '@/src/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ files: [] });

    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_email', email)
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
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { files } = await req.json();

    const newFiles = (files ?? []).map((f: any) => ({
      user_email: email,
      name: f.name,
      url: f.url,
      icon_url: f.iconUrl,
      mime_type: f.mimeType,
    }));

    if (newFiles.length === 0) return NextResponse.json({ success: true });

    const { error } = await supabase.from('files').insert(newFiles);

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

    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    if (!fileId) {
      return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('user_email', email);

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
