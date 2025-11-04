'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SettingsProps {
  onDeleteAllFiles: () => Promise<void> | void;
  onDeleteAccount: () => Promise<void> | void;
}

export default function Settings({ onDeleteAllFiles, onDeleteAccount }: SettingsProps) {
  const [user, setUser] = useState<{
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/session');
        if (!res.ok) return;
        const data = await res.json();
        setUser({
          name: data?.session?.user?.name ?? null,
          email: data?.session?.user?.email ?? null,
          image: data?.session?.user?.image ?? null,
        });
      } catch (_) {}
    })();
  }, []);

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>User Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-6 mb-6'>
            {user?.image ? (
              <img
                src={user.image}
                alt='Avatar'
                className='h-20 w-20 rounded-full object-cover border'
              />
            ) : (
              <div className='h-20 w-20 rounded-full bg-gray-200 border' />
            )}
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <Label className='mb-2 block'>Name</Label>
              <Input value={user?.name ?? ''} disabled />
            </div>
            <div>
              <Label className='mb-2 block'>Email</Label>
              <Input value={user?.email ?? ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-6'>
            <div>
              <div className='font-medium mb-1'>Delete all files</div>
              <div className='text-sm text-gray-600 mb-3'>
                You will delete all stored file records in Data Room, but your files remain in
                Google Drive.
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='destructive'>Delete All Files</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete all files?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all saved file records from Data Room. Your files on Google
                      Drive will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteAllFiles}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div>
              <div className='font-medium mb-1'>Delete account</div>
              <div className='text-sm text-gray-600 mb-3'>
                This will permanently delete your account and remove your data from our servers.
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='destructive'>Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and
                      remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteAccount}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
