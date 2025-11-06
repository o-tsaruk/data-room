'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/login' });
    } catch (e) {
      console.error('Logout error:', e);
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <Button variant='outline' size='sm' onClick={handleLogout} className='flex items-center gap-2'>
      <LogOut className='h-4 w-4' />
      Logout
    </Button>
  );
}
