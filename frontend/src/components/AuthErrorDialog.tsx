'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function AuthErrorDialog() {
  const params = useSearchParams();
  const error = params.get('error');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (error === 'OAuthAccountNotLinked') {
      setOpen(true);
    }
  }, [error]);

  if (!error) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account not linked</AlertDialogTitle>
          <AlertDialogDescription>
            This Google account is already linked to another sign-in method. Please log in using
            your original method (e.g. email link).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setOpen(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
