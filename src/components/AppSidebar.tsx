'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Folder, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';

interface FolderData {
  id: string;
  user_email: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

function FolderTreeItem({
  folder,
  allFolders,
  isNested = false,
  onRefresh,
}: {
  folder: FolderData;
  allFolders: FolderData[];
  isNested?: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get('folder');
  const children = allFolders.filter((f) => f.parent_folder_id === folder.id);
  const hasChildren = children.length > 0;
  const isActive = currentFolderId === folder.id;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/dashboard?folder=${folder.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (!hasChildren) {
    if (isNested) {
      return (
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={isActive} className='cursor-pointer'>
            <a href={`/dashboard?folder=${folder.id}`} onClick={handleClick}>
              <Folder className='h-4 w-4' />
              <span>{folder.name}</span>
            </a>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} className='cursor-pointer'>
          <a href={`/dashboard?folder=${folder.id}`} onClick={handleClick}>
            <Folder className='h-4 w-4' />
            <span>{folder.name}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (!isNested) {
    return (
      <Collapsible defaultOpen className='group/collapsible'>
        <SidebarMenuItem>
          <div className='flex items-center w-full'>
            <CollapsibleTrigger asChild>
              <button className='p-0 hover:bg-transparent' onClick={(e) => e.stopPropagation()}>
                <ChevronRight className='h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-gray-500' />
              </button>
            </CollapsibleTrigger>
            <SidebarMenuButton
              isActive={isActive}
              onClick={handleClick}
              className='flex-1 cursor-pointer'
            >
              <Folder className='h-4 w-4' />
              <span>{folder.name}</span>
            </SidebarMenuButton>
          </div>
          <CollapsibleContent>
            <SidebarMenuSub>
              {children.map((child) => (
                <FolderTreeItem
                  key={child.id}
                  folder={child}
                  allFolders={allFolders}
                  isNested={true}
                  onRefresh={onRefresh}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible defaultOpen className='group/collapsible'>
        <div className='flex items-center w-full'>
          <CollapsibleTrigger asChild>
            <button className='p-0 hover:bg-transparent' onClick={(e) => e.stopPropagation()}>
              <ChevronRight className='h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-gray-500' />
            </button>
          </CollapsibleTrigger>
          <SidebarMenuSubButton
            isActive={isActive}
            onClick={handleClick}
            className='flex-1 cursor-pointer'
          >
            <Folder className='h-4 w-4' />
            <span>{folder.name}</span>
          </SidebarMenuSubButton>
        </div>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child) => (
              <FolderTreeItem
                key={child.id}
                folder={child}
                allFolders={allFolders}
                isNested={true}
                onRefresh={onRefresh}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

export function AppSidebar({ onOpenPicker }: { onOpenPicker?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentFolderId = searchParams.get('folder');
  const isSettingsPage = pathname === '/settings';
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) throw new Error('Failed to fetch folders');
      const data = await res.json();
      const allFolders = data.folders ?? [];
      setFolders(allFolders);
    } catch (err) {
      console.error('[Sidebar] Error loading folders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
    const handleFolderDeleted = () => {
      fetchFolders();
    };
    window.addEventListener('folderDeleted', handleFolderDeleted);

    return () => {
      window.removeEventListener('folderDeleted', handleFolderDeleted);
    };
  }, []);

  const handleNewFolderClick = () => {
    setFolderName('');
    setNewFolderDialogOpen(true);
  };

  const handleNewFolder = useCallback(async () => {
    if (!folderName || !folderName.trim()) return;

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          parent_folder_id: currentFolderId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      toast.success('Folder created successfully.');
      setNewFolderDialogOpen(false);
      setFolderName('');
      await fetchFolders();
    } catch (err: any) {
      console.error('Error creating folder:', err);
      toast.error(err.message || 'Failed to create folder.');
    }
  }, [folderName, currentFolderId, fetchFolders]);

  const handleRootClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  // All folders with NULL parent are children of Root
  const rootFolders = folders.filter((f) => !f.parent_folder_id);
  const rootHasChildren = rootFolders.length > 0;

  function RootFolderItem() {
    if (rootHasChildren) {
      return (
        <Collapsible defaultOpen className='group/collapsible'>
          <SidebarMenuItem>
            <div className='flex items-center w-full'>
              <CollapsibleTrigger asChild>
                <button className='p-0 hover:bg-transparent' onClick={(e) => e.stopPropagation()}>
                  <ChevronRight className='h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-gray-500' />
                </button>
              </CollapsibleTrigger>
              <SidebarMenuButton
                isActive={!currentFolderId}
                onClick={handleRootClick}
                className='flex-1 cursor-pointer'
              >
                <Folder className='h-4 w-4' />
                <span>Root</span>
              </SidebarMenuButton>
            </div>
            <CollapsibleContent>
              <SidebarMenuSub>
                {rootFolders.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    allFolders={folders}
                    isNested={true}
                    onRefresh={fetchFolders}
                  />
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={!currentFolderId}>
          <a href='/dashboard' onClick={handleRootClick}>
            <Folder className='h-4 w-4' />
            <span>Root</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const NewFolderDialog = useMemo(
    () => (
      <AlertDialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Folder</AlertDialogTitle>
            <AlertDialogDescription>Enter a name for the new folder.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-4'>
            <Input
              placeholder='Folder name'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNewFolder();
                }
              }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFolderName('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleNewFolder}>Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [newFolderDialogOpen, folderName, handleNewFolder],
  );

  return (
    <Sidebar>
      <SidebarHeader className='mb-4'>
        <Link href='/dashboard' className='flex items-center space-x-3 px-2 py-2'>
          <img src='/logo.png' alt='Data Room Logo' className='h-10 w-10 object-contain' />
          <span className='text-xl font-semibold'>Data Room</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <div className='p-2 space-y-2'>
          {!isSettingsPage && (
            <Button onClick={handleNewFolderClick} className='w-full' size='sm'>
              New Folder
            </Button>
          )}
          {onOpenPicker && (
            <Button
              onClick={onOpenPicker}
              className='w-full size-sm bg-black text-white hover:bg-gray-800'
            >
              New File
            </Button>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>Loading folders...</SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <RootFolderItem />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {NewFolderDialog}
    </Sidebar>
  );
}
