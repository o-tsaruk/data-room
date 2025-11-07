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
    if (!email) return NextResponse.json({ files: [], folders: [] });

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');

    let filesQuery = supabase.from('files').select('*').eq('user_email', email);

    if (folderId === null || folderId === '') {
      filesQuery = filesQuery.is('folder_id', null);
    } else if (folderId) {
      filesQuery = filesQuery.eq('folder_id', folderId);
    }

    const { data: files, error: filesError } = await filesQuery.order('uploaded_at', {
      ascending: false,
    });

    if (filesError) {
      console.error('Error fetching files:', filesError);
      return NextResponse.json({ files: [], folders: [] });
    }

    // Fetch folders in the current folder
    let foldersQuery = supabase.from('folders').select('*').eq('user_email', email);

    if (folderId === null || folderId === '') {
      foldersQuery = foldersQuery.is('parent_folder_id', null);
    } else if (folderId) {
      foldersQuery = foldersQuery.eq('parent_folder_id', folderId);
    }

    const { data: folders, error: foldersError } = await foldersQuery.order('created_at', {
      ascending: true,
    });

    if (foldersError) {
      console.error('Error fetching folders:', foldersError);
    }

    const camelFiles = (files ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      url: f.url,
      iconUrl: f.icon_url,
      mimeType: f.mime_type,
      starred: f.starred,
      lastEditedDate: f.last_edited,
      uploadedAt: f.uploaded_at,
      folderId: f.folder_id,
    }));

    const camelFolders = (folders ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      parentFolderId: f.parent_folder_id,
      createdAt: f.created_at,
    }));

    return NextResponse.json({ files: camelFiles, folders: camelFolders });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ files: [], folders: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { files, folderId } = await req.json();

    const newFiles = (files ?? []).map((f: any) => ({
      user_email: email,
      name: f.name,
      url: f.url,
      icon_url: f.iconUrl,
      mime_type: f.mimeType,
      folder_id: folderId || null,
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
    const deleteAll = searchParams.get('all') === 'true';

    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let error;
    if (deleteAll) {
      ({ error } = await supabase.from('files').delete().eq('user_email', email));
    } else {
      if (!fileId) {
        return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
      }
      ({ error } = await supabase.from('files').delete().eq('id', fileId).eq('user_email', email));
    }

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
