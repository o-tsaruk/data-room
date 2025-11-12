'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import LogoutButton from '@/src/components/LogoutButton';
import { Folder } from '@/src/types';
import { apiRequest } from '@/src/utils/api';
import Settings from './Settings';

interface DashboardHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  disabled?: boolean;
  folders?: Folder[];
  selectedFolderId?: string | null;
  isStarredView?: boolean;
}

export default function DashboardHeader({
  searchTerm,
  onSearchChange,
  folders = [],
  selectedFolderId = null,
  isStarredView = false,
}: DashboardHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [isDeletingFiles, setIsDeletingFiles] = useState(false);

  const breadcrumbPath = useMemo(() => {
    if (isStarredView) {
      return [{ id: null, name: 'Starred' }];
    }

    const path: { id: string | null; name: string }[] = [{ id: null, name: 'All files' }];

    if (!selectedFolderId) {
      return path;
    }

    const folderMap = new Map<string, Folder>();
    folders.forEach((folder) => {
      folderMap.set(folder.id, folder);
    });

    let currentFolderId: string | null = selectedFolderId;
    const pathItems: { id: string; name: string }[] = [];

    while (currentFolderId) {
      const folder = folderMap.get(currentFolderId);
      if (!folder) break;

      pathItems.unshift({ id: folder.id, name: folder.name });
      currentFolderId = folder.parentFolderId || null;
    }

    return [...path, ...pathItems];
  }, [folders, selectedFolderId, isStarredView]);

  const shouldShowEllipsis = breadcrumbPath.length > 3;
  const ellipsisItems = shouldShowEllipsis ? breadcrumbPath.slice(1, -2) : [];
  const visibleItems = shouldShowEllipsis
    ? [breadcrumbPath[0], ...breadcrumbPath.slice(-2)]
    : breadcrumbPath;

  const handleBreadcrumbClick = (folderId: string | null) => {
    if (folderId === null) {
      router.push('/dashboard');
    } else {
      router.push(`/dashboard?folder=${folderId}`);
    }
  };

  const handleDeleteAllFiles = useCallback(async () => {
    setIsDeletingFiles(true);
    try {
      const userEmail = session?.user?.email || null;
      const res = await apiRequest('/api/files?all=true', { method: 'DELETE' }, userEmail);
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete all files:', data.error || res.statusText);
        toast.error('Failed to delete all files.');
        setIsDeletingFiles(false);
        return false;
      }
      toast.success('All files and folders deleted.');
      window.dispatchEvent(new CustomEvent('allFilesDeleted'));
      setIsDeletingFiles(false);
      return true;
    } catch (e) {
      console.error('Delete all files error:', e);
      toast.error('Failed to delete all files.');
      setIsDeletingFiles(false);
      return false;
    }
  }, [session]);

  const handleDeleteFilesComplete = useCallback(() => {
    setSettingsDialogOpen(false);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const userEmail = session?.user?.email || null;
      const res = await apiRequest('/api/account', { method: 'DELETE' }, userEmail);
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete account:', data.error || res.statusText);
        return;
      }
      await signOut({ callbackUrl: '/login' });
    } catch (e) {
      console.error('Delete account error:', e);
      toast.error('Failed to delete account.');
    }
  }, [router, session]);

  function SettingsDialog() {
    return (
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your account settings and preferences.</DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Settings
              onDeleteAllFiles={handleDeleteAllFiles}
              onDeleteAccount={handleDeleteAccount}
              isDeletingFiles={isDeletingFiles}
              onDeleteFilesComplete={handleDeleteFilesComplete}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  useEffect(() => {
    const handleOpenSettings = () => {
      setSettingsDialogOpen(true);
    };
    window.addEventListener('openSettings', handleOpenSettings);
    return () => {
      window.removeEventListener('openSettings', handleOpenSettings);
    };
  }, []);

  return (
    <header className='sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-6 py-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-4 flex-1 min-w-0'>
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              {shouldShowEllipsis ? (
                <>
                  {/* All files */}
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => handleBreadcrumbClick(null)}
                      className='cursor-pointer'
                    >
                      {visibleItems[0].name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {/* Ellipsis dropdown */}
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className='flex items-center gap-1'>
                        <BreadcrumbEllipsis className='size-4' />
                        <span className='sr-only'>Toggle menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='start'>
                        {ellipsisItems.map((ellipsisItem) => (
                          <DropdownMenuItem
                            key={ellipsisItem.id}
                            onClick={() => handleBreadcrumbClick(ellipsisItem.id)}
                            className='cursor-pointer'
                          >
                            {ellipsisItem.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {/* Second-to-last folder */}
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => handleBreadcrumbClick(visibleItems[1].id)}
                      className='cursor-pointer'
                    >
                      {visibleItems[1].name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {/* Last folder (current) */}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{visibleItems[2].name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                visibleItems.map((item, index) => (
                  <React.Fragment key={item.id || 'root'}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === visibleItems.length - 1 ? (
                        <BreadcrumbPage>{item.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          onClick={() => handleBreadcrumbClick(item.id)}
                          className='cursor-pointer'
                        >
                          {item.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-3'>
          <div className='max-w-md'>
            <Input
              placeholder='Search file'
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className='w-full bg-white border border-gray-200 shadow-sm'
            />
          </div>
          {session?.user?.email && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSettingsDialogOpen(true)}
              className='flex items-center gap-2'
            >
              <SettingsIcon className='h-4 w-4 mr-2' />
              Settings
            </Button>
          )}
          <LogoutButton />
        </div>
      </div>
      <SettingsDialog />
    </header>
  );
}
