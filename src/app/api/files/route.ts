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
    const starred = searchParams.get('starred') === 'true';
    const search = searchParams.get('search');

    let filesQuery = supabase.from('files').select('*').eq('user_email', email);

    if (search && search.trim()) {
      filesQuery = filesQuery.ilike('name', `%${search.trim()}%`);
    } else if (starred) {
      filesQuery = filesQuery.eq('starred', true);
    } else if (folderId === null || folderId === '') {
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

    // Fetch folders in the current folder (skip if starred view)
    let folders: any[] = [];
    if (!starred) {
      let foldersQuery = supabase.from('folders').select('*').eq('user_email', email);

      if (folderId === null || folderId === '') {
        foldersQuery = foldersQuery.is('parent_folder_id', null);
      } else if (folderId) {
        foldersQuery = foldersQuery.eq('parent_folder_id', folderId);
      }

      const { data: foldersData, error: foldersError } = await foldersQuery.order('created_at', {
        ascending: true,
      });

      if (foldersError) {
        console.error('Error fetching folders:', foldersError);
      } else {
        folders = foldersData ?? [];
      }
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

    const camelFolders = folders.map((f: any) => ({
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

    let validFolderId: string | null = null;
    if (folderId) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_email', email)
        .single();

      if (folderError || !folder) {
        console.warn(`Folder ${folderId} not found for user ${email}, saving files to root folder`);
        validFolderId = null;
      } else {
        validFolderId = folderId;
      }
    }

    const newFiles = (files ?? []).map((f: any) => ({
      user_email: email,
      name: f.name,
      url: f.url,
      icon_url: f.iconUrl,
      mime_type: f.mimeType,
      folder_id: validFolderId,
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

export async function PATCH(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { fileId, name } = await req.json();
    if (!fileId || !name) {
      return NextResponse.json({ error: 'File ID and name are required' }, { status: 400 });
    }

    // Get the file to check its current folder and mime type
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('folder_id, mime_type')
      .eq('id', fileId)
      .eq('user_email', email)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check for collision: same name + mimeType in the same folder
    let collisionQuery = supabase
      .from('files')
      .select('id')
      .eq('user_email', email)
      .eq('name', name.trim())
      .eq('mime_type', file.mime_type)
      .neq('id', fileId);

    // Handle null folder_id correctly
    if (file.folder_id === null) {
      collisionQuery = collisionQuery.is('folder_id', null);
    } else {
      collisionQuery = collisionQuery.eq('folder_id', file.folder_id);
    }

    const { data: existingFiles, error: collisionError } = await collisionQuery;

    if (collisionError) {
      console.error('Error checking for collisions:', collisionError);
      return NextResponse.json(
        { error: 'Error checking for file name collision' },
        { status: 500 },
      );
    }

    if (existingFiles && existingFiles.length > 0) {
      return NextResponse.json(
        { error: 'A file with this name and type already exists in this folder' },
        { status: 409 },
      );
    }

    // Update the file name
    const { error } = await supabase
      .from('files')
      .update({ name: name.trim() })
      .eq('id', fileId)
      .eq('user_email', email);

    if (error) {
      console.error('Error renaming file:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error renaming file:', error);
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
      if (error) {
        console.error('Error deleting files:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      ({ error } = await supabase.from('folders').delete().eq('user_email', email));
      if (error) {
        console.error('Error deleting folders:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
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
