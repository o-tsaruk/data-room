import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { serverSession } from '@/src/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface Folder {
  id: string;
  user_email: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

export async function GET(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ folders: [] });

    const { data: folders, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
      return NextResponse.json({ folders: [] });
    }

    return NextResponse.json({ folders: folders ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ folders: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { name, parent_folder_id } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    let validParentFolderId: string | null = null;
    if (parent_folder_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', parent_folder_id)
        .eq('user_email', email)
        .single();

      if (parentError || !parentFolder) {
        console.warn(
          `Parent folder ${parent_folder_id} not found for user ${email}, creating folder in root`,
        );
        validParentFolderId = null;
      } else {
        validParentFolderId = parent_folder_id;
      }
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        user_email: email,
        name,
        parent_folder_id: validParentFolderId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ folder });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { folderId, name } = await req.json();
    if (!folderId || !name) {
      return NextResponse.json({ error: 'Folder ID and name are required' }, { status: 400 });
    }

    // Get the folder to check its current parent folder
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('parent_folder_id')
      .eq('id', folderId)
      .eq('user_email', email)
      .single();

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check for collision: same name in the same parent folder
    const { data: existingFolders } = await supabase
      .from('folders')
      .select('id')
      .eq('user_email', email)
      .eq('name', name.trim())
      .eq('parent_folder_id', folder.parent_folder_id)
      .neq('id', folderId);

    if (existingFolders && existingFolders.length > 0) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 },
      );
    }

    // Update the folder name
    const { error } = await supabase
      .from('folders')
      .update({ name: name.trim() })
      .eq('id', folderId)
      .eq('user_email', email);

    if (error) {
      console.error('Error renaming folder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error renaming folder:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteFolderRecursive(folderId: string, email: string): Promise<void> {
  const { data: childFolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_folder_id', folderId)
    .eq('user_email', email);

  if (childFolders) {
    for (const child of childFolders) {
      await deleteFolderRecursive(child.id, email);
    }
  }

  await supabase.from('files').delete().eq('folder_id', folderId).eq('user_email', email);
  await supabase.from('folders').delete().eq('parent_folder_id', folderId).eq('user_email', email);
  await supabase.from('folders').delete().eq('id', folderId).eq('user_email', email);
}

export async function DELETE(req: Request) {
  try {
    const session = await serverSession();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    await deleteFolderRecursive(folderId, email);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
