'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import LogoutButton from '@/src/components/LogoutButton';
import Settings from './Settings';

interface DashboardHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  disabled?: boolean;
}

export default function DashboardHeader({
  searchTerm,
  onSearchChange,
  disabled = false,
}: DashboardHeaderProps) {
  const { data: session } = useSession();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const handleDeleteAllFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files?all=true', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete all files:', data.error || res.statusText);
        return;
      }
      toast.success('All files deleted.');
    } catch (e) {
      console.error('Delete all files error:', e);
      toast.error('Failed to delete all files.');
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
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
  }, []);

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
        <div className='flex items-center gap-2'>
          <SidebarTrigger />
        </div>
        <div className='flex items-center gap-3'>
          <div className='max-w-md'>
            <Input
              placeholder='Search file'
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className='w-full bg-white border border-gray-200 shadow-sm'
              disabled={disabled}
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
