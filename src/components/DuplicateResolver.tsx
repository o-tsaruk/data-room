'use client';

import { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { File } from '@/src/types';

interface DuplicateResolverProps {
  conflicts: File[];
  onComplete: (resolvedFiles: File[]) => void;
  onCancel: () => void;
}

export default function DuplicateResolver({
  conflicts,
  onComplete,
  onCancel,
}: DuplicateResolverProps) {
  const [index, setIndex] = useState(0);
  const [resolved, setResolved] = useState<File[]>([]);
  const current = conflicts[index];
  const [name, setName] = useState<string>(current?.name ?? '');

  const isLast = index >= conflicts.length - 1;

  const handleSkip = () => {
    if (isLast) {
      onComplete(resolved);
    } else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setName(conflicts[nextIndex].name);
    }
  };

  const handleSave = () => {
    const updated: File = { ...current, name: name.trim() || current.name };
    const newResolved = [...resolved, updated];
    setResolved(newResolved);
    if (isLast) {
      onComplete(newResolved);
    } else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setName(conflicts[nextIndex].name);
    }
  };

  useMemo(() => {
    if (current) setName(current.name);
  }, [index, conflicts]);

  if (!current) return null;

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate file detected</AlertDialogTitle>
          <AlertDialogDescription>
            A file with the same name and type already exists. You can rename this file or skip it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className='py-2'>
          <div className='text-sm text-gray-700 mb-2'>Original name</div>
          <div className='text-sm mb-4'>{current.name}</div>
          <div className='text-sm text-gray-700 mb-2'>New name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <div className='text-xs text-gray-500 mt-2'>
            {index + 1} of {conflicts.length}
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant='outline' onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
